// Full Next app QA. See docs/engineering/AUTH_UX_QA.md for isolated setup.
// Every browser auth request is mocked; external browser requests are blocked.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.AXE_MODULE || '@axe-core/playwright');
const origin = process.env.AUTH_QA_ORIGIN || 'http://127.0.0.1:3218';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'QA must use a local fixture app');
const artifacts = resolve(process.env.QA_ARTIFACTS || '/tmp/pr18-phase2/artifacts');
mkdirSync(artifacts, { recursive: true });
const temp = mkdtempSync(join(tmpdir(), 'auth-qa-'));
await build({ stdin: { contents: `export {TERMS_SECTIONS,TERMS_VERSION} from './lib/terms'; export {deliverVerificationEmail} from './lib/verification-email-delivery';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: join(temp, 'fixture.mjs') });
const { TERMS_SECTIONS, TERMS_VERSION, deliverVerificationEmail } = await import(pathToFileURL(join(temp, 'fixture.mjs')));
const verificationUrl = 'https://auth.example.test/api/auth/verify-email?token=' + 'fixture-only-'.repeat(45) + '&callbackURL=%2Fsign-in%3Fverified%3D1';
let mail;
await deliverVerificationEmail({ email: 'qa@example.test', url: verificationUrl, token: 'disposable-fixture' }, { VERCEL_ENV: 'preview', BETTER_AUTH_URL: 'https://auth.example.test', STAGING_VERIFICATION_EMAIL_ALLOWLIST: 'qa@example.test', RESEND_API_KEY: 'mock-only', RESEND_EMAIL_DOMAIN: 'example.test' }, async (_key, payload) => { mail = payload; return { error: null }; });
writeFileSync(join(artifacts, 'verification-email.html'), mail.html);
writeFileSync(join(artifacts, 'verification-email.txt'), mail.text);
assert.ok(mail.text.includes(verificationUrl));
assert.match(mail.text, /expires in 1 hour/);
assert.deepEqual(Buffer.from(mail.attachments[0].content, 'base64'), readFileSync('public/physcratic-email-logo.png'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const results = [];
const viewports = [[375, 667], [390, 844], [768, 1024], [1280, 800], [1440, 900]];
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow');
}
async function audit(page, name, scope = 'main') {
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(el => getComputedStyle(el).opacity === '1'), scope);
  await page.waitForTimeout(250); // Radix entrance transition is 200ms; measure settled colors.
  const report = await new AxeBuilder({ page }).include(scope).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', ...(scope === 'body' ? [] : ['best-practice'])]).analyze();
  writeFileSync(join(artifacts, `${name}-axe.json`), JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2));
  assert.deepEqual(report.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], name);
}
// WCAG non-text control contrast is checked separately; axe does not cover input borders.
async function controlContrast(page, selector) {
  const ratio = await page.locator(selector).evaluate(el => {
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = color => rgb(color).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((v, x, i) => v + x * [.2126, .7152, .0722][i], 0);
    const style = getComputedStyle(el); let parent = el;
    while (getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
    const a = luminance(style.borderColor), b = luminance(getComputedStyle(parent).backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  assert.ok(ratio >= 3, `${selector} boundary contrast ${ratio}`);
  return Number(ratio.toFixed(2));
}
try {
  for (const [width, height] of viewports) for (const theme of ['light', 'dark']) {
    const id = `${width}x${height}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = []; const requests = [];
    page.on('pageerror', e => errors.push(e.message));
    let signupCode = ''; let signInCode = 'EMAIL_NOT_VERIFIED'; let resendFailure = false;
    let gate; let release;
    await context.addInitScript(theme => {
      localStorage.setItem('theme', theme);
      window.__captchaFails = false; window.__captchaCalls = 0;
      window.grecaptcha = { ready: cb => cb(), execute: async () => { window.__captchaCalls++; if (window.__captchaFails) throw new Error('fixture'); return `fixture-${window.__captchaCalls}`; } };
    }, theme);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith('/api/auth/')) return route.continue();
      requests.push({ path: url.pathname, body: route.request().postDataJSON(), captcha: route.request().headers()['x-captcha-response'] });
      if (gate) await gate;
      let code = ''; let status = 200;
      if (url.pathname.endsWith('/sign-up/email')) code = signupCode;
      if (url.pathname.endsWith('/sign-in/email')) code = signInCode;
      if (url.pathname.endsWith('/send-verification-email') && resendFailure) code = 'SERVICE_UNAVAILABLE';
      if (code) status = code === 'EMAIL_NOT_VERIFIED' ? 403 : 400;
      return route.fulfill({ status, json: code ? { code, message: 'Fixture response' } : url.pathname.endsWith('/get-session') ? null : { user: { id: 'fixture' }, token: null } });
    });
    const goto = async path => { await page.goto(origin + path); await page.locator('main').waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForFunction(theme => document.documentElement.classList.contains(theme), theme); };
    const shot = async name => { await noOverflow(page); await page.screenshot({ path: join(artifacts, `${id}-${name}.png`), fullPage: name !== 'dialog' }); };
    await goto('/sign-up'); await page.locator('#account-name').waitFor();
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
    const contrast = { input: await controlContrast(page, '#account-email'), checkbox: await controlContrast(page, '#account-terms') };
    await audit(page, `${id}-signup`); await shot('signup');
    assert.equal(await page.getByRole('checkbox', { name: 'I have read and agree to the Terms of Service' }).count(), 1);
    const checkbox = page.locator('#account-terms');
    assert.equal(await checkbox.isChecked(), false);
    await page.getByLabel('Name', { exact: true }).fill('QA Person');
    await page.getByLabel('Email', { exact: true }).fill('qa@example.test');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.locator('#account-terms-error').waitFor();
    assert.match(await checkbox.getAttribute('aria-describedby'), /account-terms-error/);
    assert.equal(requests.filter(r => r.path.endsWith('/sign-up/email')).length, 0);
    await audit(page, `${id}-consent-error`); await shot('consent-error');
    const trigger = page.getByRole('button', { name: 'Terms of Service', exact: true });
    await trigger.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Terms of Service' }); await dialog.waitFor();
    await audit(page, `${id}-dialog`, '[role=dialog]');
    assert.deepEqual(await dialog.locator('article h2').allTextContents(), TERMS_SECTIONS.map((s, i) => `${i + 1}. ${s.title}`));
    assert.deepEqual(await dialog.locator('article p').allTextContents(), TERMS_SECTIONS.flatMap(s => s.paragraphs));
    assert.doesNotMatch(await dialog.innerText(), /2026-10-30-draft-1|pending legal review|Starter terms/);
    const scroll = page.getByRole('region', { name: 'Complete Terms of Service' });
    await scroll.evaluate(el => el.scrollTop = el.scrollHeight); assert.equal(await checkbox.isChecked(), false);
    for (const key of ['Tab', 'Shift+Tab']) for (let n = 0; n < 8; n++) { await page.keyboard.press(key); assert.ok(await dialog.evaluate(el => el.contains(document.activeElement))); }
    const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.y >= 0 && box.width <= width && box.height <= height);
    await scroll.evaluate(el => el.scrollTop = 0); await shot('dialog');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert.equal(await checkbox.isChecked(), false); assert.ok(await trigger.evaluate(el => el === document.activeElement));
    await trigger.click(); await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
    await dialog.waitFor({ state: 'hidden' }); assert.equal(await checkbox.isChecked(), false);
    await trigger.click(); await dialog.getByRole('button', { name: 'I agree', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(await checkbox.isChecked(), true); assert.ok(await trigger.evaluate(el => el === document.activeElement));
    await checkbox.click(); assert.equal(await checkbox.isChecked(), false); await checkbox.focus(); await page.keyboard.press('Space');
    assert.equal(await page.getByLabel('Email', { exact: true }).inputValue(), 'qa@example.test');
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'fixture-password');
    assert.equal(await page.getByLabel('Name', { exact: true }).inputValue(), 'QA Person');
    assert.equal(requests.filter(r => r.path.endsWith('/sign-up/email')).length, 0, 'dialog buttons must not submit');
    await page.evaluate(() => window.__captchaFails = true);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText('Security check unavailable. Please try again.').waitFor(); await shot('captcha-error');
    await page.evaluate(() => window.__captchaFails = false); signupCode = 'TERMS_ACCEPTANCE_REQUIRED';
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText('Please reload this page, review the current Terms of Service, and accept them before continuing.').waitFor();
    signupCode = ''; gate = new Promise(resolve => release = resolve);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText('Creating account…', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Create account', exact: true }).isDisabled());
    assert.equal(await page.locator('#account-form').getAttribute('aria-busy'), 'true'); await shot('signup-loading');
    release(); gate = undefined;
    const noticeHeading = page.getByRole('heading', { name: /Account next steps|Verify your email/, exact: true }); await noticeHeading.waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent === 'Account next steps');
    assert.equal(await noticeHeading.textContent(), 'Account next steps');
    await audit(page, `${id}-verification`); await shot('verification');
    const signup = requests.filter(r => r.path.endsWith('/sign-up/email'));
    assert.ok(signup.every(r => r.body.termsAccepted === true && r.body.termsVersion === TERMS_VERSION && !r.body.termsAcceptedAt && r.captcha));
    assert.notEqual(signup.at(-1).captcha, signup.at(-2).captcha, 'fresh CAPTCHA on retry');
    resendFailure = true;
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await page.getByText('Could not send', { exact: true }).waitFor(); await audit(page, `${id}-resend-error`); await shot('resend-error');
    resendFailure = false; gate = new Promise(resolve => release = resolve);
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await page.getByText('Requesting verification email…').waitFor();
    assert.equal(await page.locator('#resend-verification').getAttribute('aria-busy'), 'true');
    release(); gate = undefined; await page.getByText('Request received', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await page.getByText('Please wait a minute before requesting another email.').waitFor();
    await page.getByRole('button', { name: 'Back to account form' }).click();
    await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
    await goto('/sign-in'); await page.locator('#account-email').waitFor(); await audit(page, `${id}-signin`); await shot('signin');
    await page.getByLabel('Email', { exact: true }).fill('qa@example.test'); await page.getByLabel('Password', { exact: true }).fill('fixture-password');
    signInCode = 'INVALID_EMAIL_OR_PASSWORD'; gate = new Promise(resolve => release = resolve);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Signing in…', { exact: true }).waitFor(); await shot('signin-loading'); release(); gate = undefined;
    await page.getByText('Sign-in failed. Check your details and try again.').waitFor(); await audit(page, `${id}-signin-error`); await shot('signin-error');
    signInCode = 'EMAIL_NOT_VERIFIED'; await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await noticeHeading.waitFor(); assert.equal(await noticeHeading.textContent(), 'Verify your email');
    assert.ok(requests.filter(r => /sign-in|send-verification/.test(r.path)).every(r => !r.captcha));
    for (const error of ['TOKEN_EXPIRED', 'INVALID_TOKEN']) {
      await goto(`/sign-in?error=${error}`); await page.getByText('Link unavailable', { exact: true }).waitFor();
      await audit(page, `${id}-${error}`); await shot(error.toLowerCase());
      await page.getByRole('button', { name: 'Need a verification email?' }).click(); await noticeHeading.waitFor();
    }
    await goto('/sign-in?verified=1'); await page.getByText('Ready to sign in', { exact: true }).waitFor(); await shot('verified');
    await goto('/terms'); await page.getByRole('heading', { name: 'Terms of Service', exact: true }).waitFor();
    assert.deepEqual(await page.locator('article h2').allTextContents(), TERMS_SECTIONS.map((s, i) => `${i + 1}. ${s.title}`));
    assert.deepEqual(await page.locator('article p').allTextContents(), TERMS_SECTIONS.flatMap(s => s.paragraphs));
    assert.doesNotMatch(await page.locator('main').innerText(), /Physcratic · Legal|On this page|2026-10-30-draft-1|pending legal review/);
    await page.getByText('October 2026', { exact: true }).waitFor(); await audit(page, `${id}-terms`); await shot('terms');
    assert.deepEqual(errors, [], 'browser runtime errors');
    results.push({ viewport: `${width}x${height}`, theme, status: 'Passed', contrast }); console.log('PASS full-app', id);
    await context.close();
  }
  for (const width of [320, 375, 600]) for (const theme of ['light', 'dark']) for (const blocked of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme }); const page = await context.newPage();
    await context.route('**/*', route => route.abort());
    // CID replacement previews the actual attachment bytes, not an email-client delivery simulation.
    const html = mail.html.replace('cid:physcratic-logo', blocked ? 'https://blocked.invalid/logo.png' : `data:image/png;base64,${mail.attachments[0].content}`);
    await page.setContent(html); await page.evaluate(() => document.fonts.ready);
    await noOverflow(page);
    assert.equal(await page.getByRole('link', { name: 'Verify email', exact: true }).getAttribute('href'), verificationUrl);
    assert.equal(await page.locator('a').nth(1).getAttribute('href'), verificationUrl);
    assert.equal(await page.locator('img').getAttribute('alt'), 'Physcratic');
    if (!blocked) assert.deepEqual(await page.locator('img').evaluate(img => [img.naturalWidth, img.naturalHeight, img.width, img.height]), [96, 96, 72, 72]);
    await page.getByText('This link expires in 1 hour.', { exact: true }).waitFor();
    await audit(page, `email-${width}-${theme}-${blocked}`, 'body');
    await page.screenshot({ path: join(artifacts, `email-${width}-${theme}-${blocked ? 'blocked' : 'images'}.png`), fullPage: true });
    await context.close();
  }
  results.push({ interface: 'Email Chromium preview only', widths: [320, 375, 600], themes: ['light', 'dark'], blockedImages: true, status: 'Passed' });
  writeFileSync(join(artifacts, 'matrix.json'), JSON.stringify(results, null, 2));
  console.log('PASS email browser previews; Gmail/Outlook/Apple Mail NOT TESTED');
} finally { await browser.close(); rmSync(temp, { recursive: true, force: true }); }
