import assert from "node:assert/strict";
import test from "node:test";

test("disabled Settings and public page exports stay safe with an absent profile schema", async () => {
  const previous = process.env.COMMUNITY_PROFILES_ENABLED;
  delete process.env.COMMUNITY_PROFILES_ENABLED;
  try {
    const { default: Settings } = await import("../app/settings/page");
    const element = await Settings({ searchParams: Promise.resolve({ onboarding: "1" }) });
    assert.equal(element.props.profilesEnabled, false); assert.equal(element.props.mediaEnabled, false);
    const { default: Profile } = await import("../app/u/[handle]/page");
    await assert.rejects(Profile({ params: Promise.resolve({ handle: "nonexistent" }) }), /NEXT_HTTP_ERROR_FALLBACK;404/);
  } finally { if (previous === undefined) delete process.env.COMMUNITY_PROFILES_ENABLED; else process.env.COMMUNITY_PROFILES_ENABLED = previous; }
});
