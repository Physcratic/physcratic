import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileCard } from "../components/community/profile-card";
import { AccountSettings } from "../components/community/account-settings";
import { publicProfileSchema, onboardingKey } from "../lib/community/profile-client";

test("profile rendering uses only approved fields and escapes biography and display names", () => {
  const profile = { handle: "chosen_handle", displayName: "<img src=x onerror=alert(1)>", bio: "<script>alert(1)</script>", educationLevel: "university", favoriteTopicIds: ["mechanics"] } as const;
  const html = renderToStaticMarkup(createElement(ProfileCard, { profile: { ...profile, favoriteTopicIds: ["mechanics"] } }));
  assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<script>|onerror="|Member since|followers|Achievements|Solved|email|createdAt/);
  assert.match(html, /University/); assert.match(html, /Mechanics/); assert.match(html, /@chosen_handle/);
  assert.equal(publicProfileSchema.safeParse({ ...profile, email: "PRIVATE_EMAIL" }).success, false);
});
test("disabled profile settings preserve accessible appearance choices and never render inert profile fields", () => {
  const html = renderToStaticMarkup(createElement(AccountSettings, { profilesEnabled: false, mediaEnabled: false }));
  assert.match(html, /Account Settings/); assert.match(html, /Community profiles are not available yet/);
  for (const value of ["light", "dark", "system"]) assert.ok(html.includes(`value="${value}"`));
  assert.doesNotMatch(html, /id="profile-handle"|id="avatar-file"|Create profile/);
  assert.match(html, /Settings sections/); assert.match(html, /Appearance/);
  // Tours are their own settings section, linked from the nav and placed after Appearance.
  assert.match(html, /href="#tours-settings"/); assert.match(html, /id="tours-settings"/);
  assert.ok(html.indexOf('id="appearance-settings"') < html.indexOf('id="tours-settings"'));
});
test("onboarding dismissal keys are versioned and separated by stable account ID", () => {
  assert.notEqual(onboardingKey("owner"), onboardingKey("other"));
  assert.equal(onboardingKey("owner"), "physcratic:profile-setup:v1:owner");
});
test("profile images bypass optimization caches and use only application URLs", () => {
  const id = "00000000-0000-4000-8000-000000000001", url = "/api/community/profile-media/image/00000000-0000-4000-8000-000000000001";
  const html = renderToStaticMarkup(createElement(ProfileCard, {
    profile: { handle: "chosen_handle", displayName: "Chosen", bio: "", educationLevel: "other", favoriteTopicIds: [] },
    media: { avatar: { id, url }, banner: null },
  }));
  assert.ok(html.includes(`src="${url}"`)); assert.doesNotMatch(html, /\/_next\/image|blob\.vercel-storage/);
});
