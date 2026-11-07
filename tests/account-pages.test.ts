import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AuthForm } from "../components/auth-form";
import { EmailChangeResult, ForgotPasswordForm, ResetPasswordForm } from "../components/account/account-pages";
import { emailChangeOutcome, EMAIL_NOT_READY_MESSAGE } from "../lib/account-messages";
import { EmailSection, PasswordSection } from "../components/account/account-security";

(globalThis as { React?: unknown }).React = React;
const router = { back() {}, forward() {}, refresh() {}, hmrRefresh() {}, push() {}, replace() {}, prefetch() {} };
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router }, element));
const copy = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, "x");

test("sign in offers Forgot password, sign up does not", () => {
  assert.match(render(createElement(AuthForm, { mode: "sign-in", returnTo: "/dashboard" })), /href="\/forgot-password"[^>]*>Forgot password\?/);
  assert.doesNotMatch(render(createElement(AuthForm, { mode: "sign-up", returnTo: "/dashboard" })), /forgot-password/);
});

test("account pages have one h1, labelled fields and follow the copy rules", () => {
  const pages = [
    render(createElement(ForgotPasswordForm)),
    render(createElement(ResetPasswordForm, { token: "abc123", linkError: false })),
    render(createElement(ResetPasswordForm, { token: null, linkError: false })),
    render(createElement(ResetPasswordForm, { token: "abc123", linkError: true })),
    render(createElement(EmailChangeResult, emailChangeOutcome("approved", undefined))),
    render(createElement(EmailChangeResult, emailChangeOutcome("done", "TOKEN_EXPIRED"))),
  ];
  for (const html of pages) {
    assert.equal(html.match(/<h1\b/g)?.length, 1);
    for (const id of html.match(/<input[^>]*\bid="([^"]+)"/g)?.map((tag) => tag.match(/id="([^"]+)"/)![1]) ?? [])
      assert.match(html, new RegExp(`for="${id}"`), `input ${id} has a label`);
    assert.doesNotMatch(copy(html), /[–—;]/);
  }
  assert.match(pages[0], /autoComplete="email"|autocomplete="email"/i);
  assert.match(pages[1], /new-password/);
  assert.match(pages[2], /expired or was already used/);
  assert.match(pages[3], /href="\/forgot-password"/);
});

const notReady = EMAIL_NOT_READY_MESSAGE.replace("’", "&#x27;").replace("’", "&#x27;");
const says = (html: string) => html.includes(EMAIL_NOT_READY_MESSAGE) || html.includes(notReady);

test("with no email sender, the screens say so and never claim a link was sent", () => {
  const forgot = render(createElement(ForgotPasswordForm, { emailReady: false }));
  assert.ok(says(forgot));
  assert.doesNotMatch(forgot, /Send reset link|on its way|<form/);
  const email = render(createElement(EmailSection, { email: "a@example.invalid", hasPassword: true, emailReady: false }));
  assert.ok(says(email));
  assert.match(email, /<button[^>]*disabled=""[^>]*>Send approval link/);
  const setPassword = render(createElement(PasswordSection, { email: "a@example.invalid", hasPassword: false, emailReady: false }));
  assert.ok(says(setPassword));
  assert.match(setPassword, /<button[^>]*disabled=""[^>]*>Email me a link/);
});

test("with a sender, the screens work as normal and do not show the warning", () => {
  const forgot = render(createElement(ForgotPasswordForm, { emailReady: true }));
  assert.ok(!says(forgot));
  assert.match(forgot, /Send reset link/);
  const email = render(createElement(EmailSection, { email: "a@example.invalid", hasPassword: true, emailReady: true }));
  assert.ok(!says(email));
  assert.doesNotMatch(email, /<button[^>]*disabled=""[^>]*>Send approval link/);
  const setPassword = render(createElement(PasswordSection, { email: "a@example.invalid", hasPassword: false, emailReady: true }));
  assert.ok(!says(setPassword));
  assert.doesNotMatch(setPassword, /<button[^>]*disabled=""[^>]*>Email me a link/);
});

test("the signed-out confirm landing says to sign in with the new address", () => {
  const html = render(createElement(EmailChangeResult, { ...emailChangeOutcome("signed-out", undefined), signIn: true }));
  assert.match(html, /Email changed/);
  assert.match(html, /Sign in with your new address\./);
  assert.match(html, /href="\/sign-in"/);
});
