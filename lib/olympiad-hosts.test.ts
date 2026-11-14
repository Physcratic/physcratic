import assert from "node:assert/strict"
import test from "node:test"
import { olympiadHost } from "./olympiad-hosts"
import { catalogProblems } from "./corpus-catalog"

test("all current imported editions have verified host metadata", () => {
  const editions = new Set<string>()
  for (const problem of catalogProblems) {
    const host = olympiadHost(problem.competition, problem.year)
    assert.ok(host?.country && host.flag, problem.id)
    assert.match(host.flag, /^(?:[\u{1F1E6}-\u{1F1FF}]{2})+$/u)
    editions.add(`${problem.competition}-${problem.year}`)
  }
  assert.equal(editions.size, 46)
})

test("hosts depend on both competition and year", () => {
  assert.equal(olympiadHost("IPhO", 2025)?.country, "France")
  assert.equal(olympiadHost("APhO", 2025)?.country, "Saudi Arabia")
  assert.equal(olympiadHost("EuPhO", 2025)?.country, "Bulgaria")
  assert.deepEqual(olympiadHost("IPhO", 2016), { country: "Switzerland and Liechtenstein", flag: "🇨🇭🇱🇮" })
  assert.equal(olympiadHost("APhO", 2016)?.country, "Hong Kong, China")
})

test("online editions retain the verified organiser rather than an abandoned venue", () => {
  for (const year of [2020, 2021]) assert.deepEqual(olympiadHost("EuPhO", year), { country: "Estonia", flag: "🇪🇪", online: true })
  assert.equal(olympiadHost("IPhO", 2021)?.online, true)
  assert.equal(olympiadHost("APhO", 2021)?.online, true)
  assert.equal(olympiadHost("APhO", 2022)?.online, true)
})

test("missing, cancelled and future editions do not acquire guessed hosts", () => {
  for (const competition of ["IPhO", "APhO", "EuPhO"] as const) {
    for (const year of [1900, 2027, 2099, NaN]) assert.equal(olympiadHost(competition, year), undefined)
  }
  assert.equal(olympiadHost("APhO", 2020), undefined)
  assert.equal(olympiadHost("IPhO", 2020), undefined)
})
