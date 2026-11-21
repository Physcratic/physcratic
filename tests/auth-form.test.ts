import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AuthForm } from "../components/auth-form";

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

test("corrected signup explains public registration and keeps the account name private", () => {
  const render = (enabled: boolean) => renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router },
    createElement(AuthForm, { mode: "sign-up", returnTo: "/dashboard", publicProfileSignup: enabled })));
  assert.doesNotMatch(render(false), /account-username|signup-profile-notice/);
  const html = render(true);
  assert.match(html, /Private account name/);
  assert.match(html, /Public username/);
  assert.match(html, /When you verify your email/);
  assert.match(html, /name="username"/);
  assert.match(html, /I agree to the Terms of Service/);
});
