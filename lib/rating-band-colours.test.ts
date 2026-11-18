import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { ratingBands } from "./rating-bands"

// The four band colours live in app/globals.css as --band-* tokens, once for the light theme (:root) and once for the dark
// theme (.dark). This test reads them from the file, so what ships is what is measured. It checks that each band has its own
// colour in the right family (teal, blue, violet, amber, never red or green) and that the text colour keeps 4.5:1 on its own
// soft tint over the card and over the page, in both themes. WCAG 2.x relative luminance and contrast ratio.
const css = readFileSync("app/globals.css", "utf8")
type Hsl = readonly [number, number, number]
type Rgb = readonly [number, number, number]

const block = (start: string) => {
  const from = css.indexOf(start)
  assert.ok(from >= 0, start)
  return css.slice(from, css.indexOf("\n  }", from))
}
const token = (scope: string, name: string): Hsl => {
  const match = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`).exec(block(scope))
  assert.ok(match, `${scope} ${name}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}
function toRgb([h, s, l]: Hsl): Rgb {
  const sat = s / 100, light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = light - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}
const channel = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: Rgb, b: Rgb) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const tint = (colour: Rgb, alpha: number, base: Rgb): Rgb => [0, 1, 2].map((i) => colour[i] * alpha + base[i] * (1 - alpha)) as unknown as Rgb

const themes = { light: ":root {", dark: ".dark {" } as const
const names = ["beginner", "intermediate", "advanced", "mastery"] as const
// Hue ranges in degrees: teal, blue, violet and amber. Red is below 15 or above 345 and green is 80 to 150.
const family = { beginner: [165, 195], intermediate: [200, 225], advanced: [255, 285], mastery: [35, 50] } as const

/** Every measurement for a theme and band. The rating block sits on the card at a 10% tint, the badge on the card or the page at 12%. */
export function measure(theme: keyof typeof themes, name: (typeof names)[number]) {
  const scope = themes[theme]
  const strong = toRgb(token(scope, `band-${name}`))
  const card = toRgb(token(scope, "card")), page = toRgb(token(scope, "background"))
  return {
    block: contrast(strong, tint(strong, 0.1, card)),
    badgeOnCard: contrast(strong, tint(strong, 0.12, card)),
    badgeOnPage: contrast(strong, tint(strong, 0.12, page)),
    stripe: contrast(strong, card),
  }
}

test("the band variants are one for each band and the band ids, ranges and presets are untouched", () => {
  assert.deepEqual(ratingBands.map((band) => band.variant), ["band-beginner", "band-intermediate", "band-advanced", "band-mastery"])
  assert.equal(new Set(ratingBands.map((band) => band.variant)).size, 4, "no two bands look the same")
  assert.deepEqual(ratingBands.map((band) => [band.id, band.min, band.max, band.middle]), [
    ["beginner-olympiad", 0, 801, 500], ["intermediate-olympiad", 801, 1801, 1200], ["advanced", 1801, 2601, 2100], ["mastery", 2601, Infinity, 2800],
  ])
})

test("each band has its own colour in the agreed family, never red or green, in both themes", () => {
  for (const theme of Object.keys(themes) as (keyof typeof themes)[]) {
    const hues = names.map((name) => token(themes[theme], `band-${name}`)[0])
    assert.equal(new Set(hues).size, 4, `${theme}: four different hues`)
    for (const name of names) {
      const [from, to] = family[name]
      const hue = token(themes[theme], `band-${name}`)[0]
      assert.ok(hue >= from && hue <= to, `${theme} ${name} hue ${hue} is not in ${from} to ${to}`)
      assert.ok(hue >= 15 && hue <= 345 && !(hue >= 80 && hue <= 150), `${theme} ${name} is red or green`)
    }
  }
})

test("the band colour keeps 4.5:1 for text on its soft tint, and 3:1 for the stripe, in dark and light", () => {
  for (const theme of Object.keys(themes) as (keyof typeof themes)[]) {
    for (const name of names) {
      const result = measure(theme, name)
      assert.ok(result.block >= 4.5, `${theme} ${name} number and label on the rating block: ${result.block.toFixed(2)}`)
      assert.ok(result.badgeOnCard >= 4.5, `${theme} ${name} badge on the card: ${result.badgeOnCard.toFixed(2)}`)
      assert.ok(result.badgeOnPage >= 4.5, `${theme} ${name} badge on the page: ${result.badgeOnPage.toFixed(2)}`)
      assert.ok(result.stripe >= 3, `${theme} ${name} stripe on the card: ${result.stripe.toFixed(2)}`)
    }
  }
})

test("the card maps each band id to its token, the card border is neutral and no competition has a badge colour", () => {
  for (const [band, name] of ratingBands.map((entry, index) => [entry, names[index]] as const)) {
    assert.match(css, new RegExp(`\\.problem-entry\\[data-level="${band.id}"\\]\\s*\\{\\s*--band:\\s*var\\(--band-${name}\\);`), band.id)
  }
  // The neutral card border, background, radius and shadow come from the Card utilities (border, bg-card, rounded-lg and
  // the card shadow), so no base .problem-entry rule repeats them and no band or competition colours the border.
  assert.doesNotMatch(css, /\.problem-entry \{\s*background/)
  const card = readFileSync("components/ui/card.tsx", "utf8")
  assert.match(card, /rounded-lg border bg-card text-card-foreground shadow-\[var\(--card-shadow\)\]/)
  assert.doesNotMatch(css, /\.problem-entry\[data-competition/)
  // The neutral ipho, apho and eupho badge variants were unused after phase 2, so they are gone. The host flag tells the
  // competitions apart, and nothing can give one of them a colour of its own.
  const badge = readFileSync("components/ui/badge.tsx", "utf8")
  for (const competition of ["ipho", "apho", "eupho"]) assert.doesNotMatch(badge, new RegExp(`\\b${competition}:`), competition)
})
