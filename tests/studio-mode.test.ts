import assert from "node:assert/strict";
import test from "node:test";
import { CLASSIC_MODE_VALUE, STUDIO_MODE_KEY, readStudioMode } from "../components/authoring/simple-model";

function withStorage(value: string | null | "throws", run: () => void) {
  const globals = globalThis as unknown as { window?: unknown };
  const before = globals.window;
  globals.window = {
    localStorage: {
      getItem: (key: string) => {
        if (value === "throws") throw new Error("blocked");
        return key === STUDIO_MODE_KEY ? value : null;
      },
    },
  };
  try {
    run();
  } finally {
    globals.window = before;
  }
}

test("everyone gets the new editor, including people who had Advanced saved before this release", () => {
  withStorage(null, () => assert.equal(readStudioMode(), "simple"));
  withStorage("simple", () => assert.equal(readStudioMode(), "simple"));
  withStorage("easy", () => assert.equal(readStudioMode(), "simple"));
  withStorage("advanced", () => assert.equal(readStudioMode(), "simple"));
});

test("only the value the Classic editor link writes opens the old layout", () => {
  assert.equal(STUDIO_MODE_KEY, "physcratic.studio.mode");
  withStorage(CLASSIC_MODE_VALUE, () => assert.equal(readStudioMode(), "advanced"));
});

test("blocked storage means the new editor", () => {
  withStorage("throws", () => assert.equal(readStudioMode(), "simple"));
});
