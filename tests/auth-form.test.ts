import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AuthForm, signUpName } from "../components/auth-form";

(globalThis as { React?: unknown }).React = React;
const router = { back() {}, forward() {}, refresh() {}, hmrRefresh() {}, push() {}, replace() {}, prefetch() {} };

for (const mode of ["sign-up", "sign-in"] as const) {
  test(`${mode} keeps credentials in the request body before hydration or without JavaScript`, () => {
    const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router }, createElement(AuthForm, { mode, returnTo: "/dashboard/author" })));
    const form = html.match(/<form\b[^>]*\bid="account-form"[^>]*>/)?.[0];
    assert.ok(form, "The server-rendered account form must exist before hydration");
    assert.match(form, /\bmethod="post"/);
    assert.doesNotMatch(html, /\bformMethod="get"|\bformmethod="get"/i);
    assert.match(html, /type="password"[^>]*name="password"|name="password"[^>]*type="password"/);
  });
}

const render = (publicProfileSignup: boolean, mode: "sign-up" | "sign-in" = "sign-up") => renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router },
  createElement(AuthForm, { mode, returnTo: "/dashboard", publicProfileSignup })));
/** Markup with the screen reader only text taken out, which is what a person sees. */
const visible = (html: string) => html.replace(/<span class="sr-only">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");

test("public profile signup has a username and no private name field", () => {
  assert.doesNotMatch(render(false), /account-username|signup-profile-notice/);
  const html = render(true);
  assert.doesNotMatch(html, /name="name"|id="account-name"|Private account name|Public username/);
  assert.match(html, /<label[^>]*for="account-username"[^>]*>Username<\/label>/);
  assert.match(html, /name="username"/);
  assert.match(html, /I agree to the Terms of Service/);
  // Without public profiles the Name field is as it was.
  const plain = render(false);
  assert.match(plain, /<label[^>]*for="account-name"[^>]*>Name<\/label>/);
  assert.match(plain, /name="name"/);
});

test("the account name sent at sign-up is the username, trimmed", () => {
  const form = (fields: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value); return data; };
  assert.equal(signUpName(form({ username: "  Ada_Lovelace  " }), true), "Ada_Lovelace");
  assert.equal(signUpName(form({ username: "ada", name: "Someone else" }), true), "ada");
  assert.equal(signUpName(form({ name: "  Ada Lovelace " }), false), "Ada Lovelace");
  assert.equal(signUpName(form({}), true), "");
});

test("the username and password hints have the exact text and the same small size", () => {
  const html = render(true);
  const username = /<p[^>]*id="signup-profile-notice"[^>]*class="([^"]*)"[^>]*>([^<]*)<\/p>|<p[^>]*class="([^"]*)"[^>]*id="signup-profile-notice"[^>]*>([^<]*)<\/p>/.exec(html);
  assert.ok(username, "the username hint");
  assert.equal(username![2] ?? username![4], "Choose a permanent username with 3 to 24 letters, numbers or underscores.");
  const password = /<p class="([^"]*)">(Use at least 8 characters\.)<\/p>/.exec(html);
  assert.ok(password, "the password hint");
  for (const classes of [username![1] ?? username![3], password![1]]) {
    assert.match(classes, /\btext-xs\b/);
    assert.doesNotMatch(classes, /\btext-(sm|base|\[1[01]px\])\b/);
  }
  for (const gone of ["When you verify your email", "Read the Privacy Notice", "Choose a password you do not use elsewhere", "You can deactivate"]) assert.equal(html.includes(gone), false, gone);
});

test("the Terms and Privacy links open in a new tab, say so for screen readers only, and show no new tab text", () => {
  for (const publicProfileSignup of [true, false]) {
    const html = render(publicProfileSignup);
    for (const [href, text] of [["/terms", "Read the Terms of Service"], ["/privacy", "the Privacy Notice"]] as const) {
      const anchors = [...html.matchAll(/<a ([^>]*)>([^<]*)<span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/g)];
      const anchor = anchors.find((match) => match[1].includes(`href="${href}"`));
      assert.ok(anchor, `${href} link with the screen reader text`);
      assert.match(anchor![1], /target="_blank"/);
      assert.match(anchor![1], /rel="noopener noreferrer"/);
      assert.equal(anchor![2], text);
    }
    assert.equal(visible(html).includes("opens in a new tab"), false);
    assert.match(visible(html), /Read the Terms of Service and the Privacy Notice\./);
  }
});
