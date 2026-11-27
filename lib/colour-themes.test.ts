import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Three colour themes, each in light and dark, are written in app/globals.css. This test reads the file, so what ships is what is measured.
// Ink is the default on :root. Paper and Sky are on a data-colour attribute. The meaning accents and the effects are shared by all three.
const css = readFileSync("app/globals.css", "utf8")
type Hsl = readonly [number, number, number]
type Rgb = readonly [number, number, number]
const scopes = {
  "ink light": ':root, [data-colour="ink"] {', "ink dark": '.dark, .dark [data-colour="ink"] {',
  "paper light": '[data-colour="paper"] {', "paper dark": '.dark[data-colour="paper"], .dark [data-colour="paper"] {',
  "sky light": '[data-colour="sky"] {', "sky dark": '.dark[data-colour="sky"], .dark [data-colour="sky"] {',
} as const
const block = (start: string) => {
  const from = css.indexOf(start)
  assert.ok(from >= 0, start)
  return css.slice(from, css.indexOf("\n  }", from))
}
const raw = (scope: string, name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(block(scope))?.[1]
const token = (scope: string, name: string): Hsl => {
  const match = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(raw(scope, name) ?? "")
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
const mix = (a: Rgb, b: Rgb, at: number): Rgb => [a[0] + (b[0] - a[0]) * at, a[1] + (b[1] - a[1]) * at, a[2] + (b[2] - a[2]) * at]

const families = ["success", "progress", "danger", "idle"] as const
const familyTokens = families.flatMap((f) => [f, `${f}-tint`, `${f}-ink`, `${f}-foreground`])
const surfaceTokens = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground",
  "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring"]
const sidebarTokens = ["sidebar-background", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"]
const accents = ["rose", "amber", "violet", "teal"] as const

test("every colour theme defines every colour token in light and dark", () => {
  for (const [label, scope] of Object.entries(scopes))
    for (const name of [...familyTokens, ...surfaceTokens, ...sidebarTokens]) assert.ok(raw(scope, name), `${label} defines --${name}`)
})

test("the meaning accents and the effects are defined once for light and once for dark, and each theme keeps its own surfaces", () => {
  for (const mode of ["ink light", "ink dark"] as const) {
    for (const a of accents) for (const part of ["", "-tint", "-ink"]) assert.ok(raw(scopes[mode], `${a}${part}`), `${mode} --${a}${part}`)
    for (const name of ["glow-success", "header-tint"]) assert.ok(raw(scopes[mode], name), `${mode} --${name}`)
  }
  // Paper and Sky do not repeat them, so there is one accent palette and one set of effects.
  for (const mode of ["paper light", "paper dark", "sky light", "sky dark"] as const)
    for (const name of ["rose", "amber", "violet", "teal", "glow-success", "header-tint"]) assert.equal(raw(scopes[mode], name), undefined, `${mode} must not redefine --${name}`)
  // The three themes really differ, so a theme that fell back to another would show.
  const mains = new Set(["ink light", "paper light", "sky light"].map((s) => raw(scopes[s as keyof typeof scopes], "primary")))
  assert.equal(mains.size, 3)
})

for (const [label, scope] of Object.entries(scopes)) {
  const mode = label.endsWith("dark") ? "ink dark" : "ink light"
  test(`${label}: every text pair keeps 4.5:1 and every icon, border and focus ring keeps 3:1`, () => {
    const t = (name: string) => toRgb(token(scope, name))
    const text: [string, string, string][] = [
      ["body text on the page", "foreground", "background"], ["body text on the card", "foreground", "card"],
      ["destructive text on the page", "destructive", "background"], ["destructive text on the card", "destructive", "card"],
      ["muted text on the page", "muted-foreground", "background"], ["muted text on the card", "muted-foreground", "card"], ["muted text on the muted surface", "muted-foreground", "muted"],
      ["main action text", "primary-foreground", "primary"], ["accent text", "accent-foreground", "accent"], ["destructive text", "destructive-foreground", "destructive"],
    ]
    for (const [what, a, b] of text) assert.ok(contrast(t(a), t(b)) >= 4.5, `${label} ${what} is ${contrast(t(a), t(b)).toFixed(2)}`)
    for (const f of families) {
      for (const [what, a, b] of [["ink on its tint", `${f}-ink`, `${f}-tint`], ["ink on the card", `${f}-ink`, "card"], ["ink on the page", `${f}-ink`, "background"], ["text on the fill", `${f}-foreground`, f], ["body text on its tint", "foreground", `${f}-tint`]] as const)
        assert.ok(contrast(t(a), t(b)) >= 4.5, `${label} ${f} ${what} is ${contrast(t(a), t(b)).toFixed(2)}`)
    }
    const icons: [string, string, string][] = [
      ["border on the page", "border", "background"], ["border on the card", "border", "card"], ["input on the page", "input", "background"], ["input on the card", "input", "card"],
      ["focus ring on the page", "ring", "background"], ["focus ring on the card", "ring", "card"], ["success icon on the card", "success", "card"], ["danger icon on the card", "danger", "card"],
    ]
    // The progress colour is a fill, so its text and its ink are measured above. Its icons use the ink.
    for (const [what, a, b] of icons) assert.ok(contrast(t(a), t(b)) >= 3, `${label} ${what} is ${contrast(t(a), t(b)).toFixed(2)}`)
    // The accents are the same in every theme, so each is measured on this theme's surfaces.
    for (const a of accents) {
      const strong = toRgb(token(scopes[mode], a)), tint = toRgb(token(scopes[mode], `${a}-tint`)), ink = toRgb(token(scopes[mode], `${a}-ink`))
      for (const surface of ["background", "card", "muted"]) assert.ok(contrast(strong, t(surface)) >= 3, `${label} ${a} icon on ${surface} is ${contrast(strong, t(surface)).toFixed(2)}`)
      for (const [what, bg] of [["its tint", tint], ["the card", t("card")], ["the page", t("background")]] as const)
        assert.ok(contrast(ink, bg) >= 4.5, `${label} ${a} text on ${what} is ${contrast(ink, bg).toFixed(2)}`)
    }
  })

  test(`${label}: text on the header gradient keeps 4.5:1 at its worst point`, () => {
    // --header-tint runs from the success tint to the card. Every point between is a blend of those two.
    const tint = toRgb(token(scope, "success-tint")), card = toRgb(token(scope, "card"))
    for (let at = 0; at <= 1.0001; at += 0.1) {
      const point = mix(tint, card, at)
      // The header holds the body text and the success ink. Nothing muted sits on it.
      for (const name of ["foreground", "success-ink"])
        assert.ok(contrast(toRgb(token(scope, name)), point) >= 4.5, `${label} ${name} at ${at.toFixed(1)} of the gradient is ${contrast(toRgb(token(scope, name)), point).toFixed(2)}`)
    }
  })
}

test("the header tint is made of the theme's own tokens, and the glow is a shadow that is never the only sign of success", () => {
  assert.match(raw(scopes["ink light"], "header-tint")!, /hsl\(var\(--success-tint\)\).*hsl\(var\(--card\)\)/)
  assert.match(raw(scopes["ink light"], "glow-success")!, /hsl\(var\(--success\) \//)
  const banner = readFileSync("components/physics/part-progress.tsx", "utf8")
  assert.match(banner, /shadow-\[var\(--glow-success\)\]/)
  assert.match(banner, /CircleCheck/)
  assert.match(banner, /All checkable answers correct\r?\n/)
  // The glow shows only with the banner, and the banner only appears on the change, never on load.
  assert.match(readFileSync("components/physics/archive-answer-panel.tsx", "utf8"), /\{justSolved && <SolvedBanner \/>\}/)
  assert.match(banner, /motion-safe:animate-in/)
})

test("part colours stay removed", () => {
  assert.doesNotMatch(css, /--part-(teal|violet|amber|blue)/)
})
