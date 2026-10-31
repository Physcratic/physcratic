import test from "node:test";
import assert from "node:assert/strict";
import { deliverVerificationEmail, type VerificationTransport } from "./verification-email-delivery";
const mail = { email: "tester@example.com", url: "https://staging.physcratic.com/api/auth/verify-email?token=test-only", token: "test-only" };
const env = { VERCEL_ENV: "preview", BETTER_AUTH_URL: "https://staging.physcratic.com", RESEND_API_KEY: "mock-only", RESEND_EMAIL_DOMAIN: "example.com", STAGING_VERIFICATION_EMAIL_ALLOWLIST: "tester@example.com" };
test("branded verification email is concise and includes a safe fallback link", async () => {
  const payloads: { html: string; text: string; subject: string }[] = [];
  await deliverVerificationEmail(mail, env, async (_key, payload) => { payloads.push(payload); return { error: null }; });
  assert.equal(payloads.length, 1);
  const message = payloads[0];
  assert.match(message.subject, /Verify your email/);
  assert.match(message.html, /physcratic-email-logo\.png/);
  assert.match(message.html, /Verify email<\/a>/);
  assert.ok(message.html.includes(mail.url));
  assert.ok(message.text.includes(mail.url));
  assert.ok(message.text.includes("\n"));
  assert.ok(message.text.length < 360);
  assert.ok(!message.html.includes("Starter terms"));
});

test("staging recipient safety and production compatibility", async () => {
  let calls = 0;
  const transport: VerificationTransport = async (_key, payload) => { calls++; assert.equal(payload.to[0], mail.email); return { error: null }; };
  await deliverVerificationEmail(mail, env, transport); assert.equal(calls, 1);
  for (const patch of [{STAGING_VERIFICATION_EMAIL_ALLOWLIST:undefined},{STAGING_VERIFICATION_EMAIL_ALLOWLIST:""},{STAGING_VERIFICATION_EMAIL_ALLOWLIST:"*"},{STAGING_VERIFICATION_EMAIL_ALLOWLIST:"bad, tester@example.com"},{STAGING_VERIFICATION_EMAIL_ALLOWLIST:"other@example.com"},{STAGING_VERIFICATION_EMAIL_ALLOWLIST:"tester@example.com,"},{BETTER_AUTH_URL:"https://physcratic.com"}]) {
    await assert.rejects(deliverVerificationEmail(mail, {...env,...patch}, transport));
  }
  assert.equal(calls, 1, "rejected configuration/recipients never invoke provider");
  await deliverVerificationEmail(mail, {...env,VERCEL_ENV:"production",STAGING_VERIFICATION_EMAIL_ALLOWLIST:undefined},transport);
  assert.equal(calls, 2);
  await assert.rejects(deliverVerificationEmail({...mail,email:"tester@example.com\r\nBcc: victim@example.com"},env,transport));
  await assert.rejects(deliverVerificationEmail(mail,{...env,VERCEL_ENV:undefined,STAGING_VERIFICATION_EMAIL_ALLOWLIST:undefined},transport));
  assert.equal(calls, 2);
});
test("provider failure is sanitized and tokens are not included in errors", async () => {
  await assert.rejects(deliverVerificationEmail(mail,env,async()=>({error:{message:mail.token}})), /Verification email provider failed\./);
  await assert.rejects(deliverVerificationEmail(mail,env,async()=>{throw new Error(mail.token);}), /Verification email provider unavailable\./);
});

test("staging signup uses consent policy, staging verification origin and recipient gate", async () => {
  const { betterAuth } = await import("better-auth");
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  const { signupPolicy } = await import("./signup-policy");
  const { TERMS_VERSION } = await import("./terms");
  const data = {user:[],account:[],session:[],verification:[]};
  let delivered=0, blocked=0;
  const auth=betterAuth({baseURL:env.BETTER_AUTH_URL,secret:"staging-test-only-at-least-32-characters",database:memoryAdapter(data),...signupPolicy,
    emailAndPassword:{enabled:true,autoSignIn:false,requireEmailVerification:true},
    emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:false,sendVerificationEmail:async(message)=>{
      assert.equal(new URL(message.url).origin,env.BETTER_AUTH_URL);
      // Model production after() handling: delivery failure does not imply signup rollback.
      try {await deliverVerificationEmail({email:message.user.email,url:message.url,token:message.token},env,async()=>{delivered++;return {error:null};});} catch {blocked++;}
    }},rateLimit:{enabled:false},logger:{disabled:true}});
  for(const email of ["tester@example.com","not-approved@example.com"]){
    const response=await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",origin:env.BETTER_AUTH_URL},body:JSON.stringify({name:"Test",email,password:"valid-password-123",termsAccepted:true,termsVersion:TERMS_VERSION})}));
    assert.equal(response.status,200); assert.equal((await response.json()).token,null);
  }
  assert.equal(delivered,1);assert.equal(blocked,1);assert.equal(data.session.length,0);
  assert.equal(data.user.length,2);
  for(const row of data.user as Record<string,unknown>[]){assert.equal(row.emailVerified,false);assert.equal(row.termsAcceptedVersion,TERMS_VERSION);assert.ok(row.termsAcceptedAt);}
});
