import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { describeEstimate } from "../lib/rating-bands"

const read = (path: string) => readFileSync(path, "utf8")

test("a rating reads as '2,200 · Advanced', with no tilde and no estimate wording", () => {
  assert.equal(describeEstimate("2200"), "2,200 · Advanced")
  assert.equal(describeEstimate("~1850"), "1,850 · Advanced")
  assert.equal(describeEstimate("Intermediate"), "Intermediate")
})

test("the ratings popover and problem pages no longer mention estimates marked with a tilde or an Unrated line", () => {
  assert.doesNotMatch(read("components/physics/rating-bands-popover.tsx"), /marked with a|estimate/)
  assert.doesNotMatch(read("components/physics/arena-problem-reader.tsx"), /Unrated/)
  assert.match(read("components/physics/arena-problem-reader.tsx"), /Published by Physcratic/)
  assert.doesNotMatch(read("components/physics/imported-problem-reader.tsx"), /Unrated/)
  assert.doesNotMatch(read("components/physics/problem-card.tsx"), /Illustrative estimate|Estimated difficulty/)
})
