import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

// The learning colours live in app/globals.css as eight families, once for the light theme (:root) and once for the dark theme
// (.dark). This test reads them from the file, so what ships is what is measured. Every text pair keeps 4.5:1 and every family keeps
// its meaning by hue: green solved, peach in progress, red wrong, grey not graded, and teal, violet, amber and blue for parts.
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

const themes = { light: ":root {", dark: ".dark {" } as const
const families = ["success", "progress", "danger", "idle", "part-teal", "part-violet", "part-amber", "part-blue"] as const
// Hue ranges in degrees. Red is below 15 or above 345.
const hue = { success: [130, 170], progress: [15, 40], danger: [0, 15], idle: [0, 360], "part-teal": [165, 195], "part-violet": [245, 285], "part-amber": [25, 50], "part-blue": [205, 225] } as const

for (const [theme, scope] of Object.entries(themes)) {
  test(`${theme}: text on every learning colour keeps 4.5:1`, () => {
    const card = toRgb(token(scope, "card")), page = toRgb(token(scope, "background")), text = toRgb(token(scope, "foreground"))
    for (const name of families) {
      const strong = toRgb(token(scope, name)), tint = toRgb(token(scope, `${name}-tint`)), ink = toRgb(token(scope, `${name}-ink`)), on = toRgb(token(scope, `${name}-foreground`))
      const pairs: [string, number][] = [
        ["ink on its tint", contrast(ink, tint)],
        ["ink on the card", contrast(ink, card)],
        ["ink on the page", contrast(ink, page)],
        ["body text on its tint", contrast(text, tint)],
        ["text on the strong fill", contrast(on, strong)],
      ]
      for (const [label, ratio] of pairs) assert.ok(ratio >= 4.5, `${theme} ${name} ${label} is ${ratio.toFixed(2)}`)
    }
  })

  test(`${theme}: each colour family keeps its meaning by hue`, () => {
    for (const name of families) {
      const [h, s] = token(scope, name)
      if (name === "idle") assert.ok(s <= 15, `${theme} idle is grey, saturation ${s}`)
      else if (name === "danger") assert.ok(h < 15 || h > 345, `${theme} danger is red, hue ${h}`)
      else assert.ok(h >= hue[name][0] && h <= hue[name][1], `${theme} ${name} hue ${h}`)
    }
  })
}

// The neutral badge for a part and the segments of the parts bar. The chip text is the foreground on the idle tint. The chip border and the empty bar
// segment border are the site border token, which must keep the shape at 3:1 against the card and the page. A filled segment is the success colour.
for (const [theme, scope] of Object.entries(themes)) {
  test(`${theme}: the part chip and the parts bar keep their shape and their text`, () => {
    const card = toRgb(token(scope, "card")), page = toRgb(token(scope, "background")), border = toRgb(token(scope, "border"))
    const idleTint = toRgb(token(scope, "idle-tint")), text = toRgb(token(scope, "foreground")), success = toRgb(token(scope, "success"))
    const pairs: [string, number, number][] = [
      ["chip text on its fill", contrast(text, idleTint), 4.5],
      ["chip border on the card", contrast(border, card), 3],
      ["chip border on the page", contrast(border, page), 3],
      ["empty segment border on the card", contrast(border, card), 3],
      ["filled segment on the card", contrast(success, card), 3],
      ["filled segment on the page", contrast(success, page), 3],
    ]
    for (const [label, ratio, least] of pairs) assert.ok(ratio >= least, `${theme} ${label} is ${ratio.toFixed(2)}, needs ${least}`)
  })
}
