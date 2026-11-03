import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileCard } from "../components/community/profile-card";
import { AccountSettings } from "../components/community/account-settings";
import { publicProfileSchema, onboardingKey } from "../lib/community/profile-client";
import { ProfilePictureUpload } from "../components/community/profile-picture-upload";
import { ProfileMediaControls } from "../components/community/profile-media-controls";

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
test("picture picker labels the file input and shows saved media without exposing storage URLs", () => {
  const id = "00000000-0000-4000-8000-000000000001", url = `/api/community/profile-media/image/${id}`;
  const html = renderToStaticMarkup(createElement(ProfilePictureUpload, {
    media: { id, url }, busy: false, onUpload: async () => true, onRemove: () => {},
  }));
  assert.match(html, /Your saved picture/); assert.match(html, /Choose a replacement/);
  assert.match(html, /for="avatar-file"/); assert.match(html, /aria-describedby="avatar-help"/);
  assert.match(html, /Remove picture/); assert.ok(html.includes(`src="${url}"`));
  assert.doesNotMatch(html, /blob\.vercel-storage|\/_next\/image|Save picture/);
});
test("media controls keep upload fields behind saved-profile and verification gates", () => {
  for (const [enabled, saved, verified, message] of [
    [false, true, true, "Profile images are not available yet"],
    [true, false, true, "Save your profile before adding images"],
    [true, true, false, "Verify your email before changing profile images"],
  ] as const) {
    const html = renderToStaticMarkup(createElement(ProfileMediaControls, { ownerId: "test-owner", enabled, saved, verified, onChange: () => {} }));
    assert.ok(html.includes(message)); assert.doesNotMatch(html, /id="avatar-file"|Save picture|Remove picture/);
  }
});
