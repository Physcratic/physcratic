// Loads every URL in sitemap.xml and llms.txt on a running site and checks its head.
// Usage: node scripts/check-seo.mjs http://localhost:3000   (Node 22, no dependencies)
// Checks: one title of at most 60 characters, a description of 70 to 160 characters, a canonical,
// no duplicated titles or descriptions, JSON-LD that parses and an og:image that returns 200.
// Pages that say noindex are exempt from the description and canonical rules.
// Set SEO_TABLE=1 to print one line per page. The exit code is 1 when anything is wrong.
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const paths = new Set();
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) paths.add(new URL(decode(loc)).pathname + new URL(decode(loc)).search);
const llms = await (await fetch(`${base}/llms.txt`)).text();
for (const [, url] of llms.matchAll(/\]\((https?:[^)]+)\)/g)) { const u = new URL(url); if (u.hostname === new URL(base).hostname || u.hostname === "localhost") paths.add(u.pathname + u.search); }

const meta = (html, re) => { const m = html.match(re); return m ? decode(m[1]).trim() : null; };
const rows = [];
const problems = [];
for (const path of [...paths].sort()) {
  const res = await fetch(base + path, { redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const row = { path, status: res.status };
  if (res.status !== 200) problems.push(`${path}: status ${res.status}`);
  row.title = meta(html, /<title>([^<]*)<\/title>/);
  row.description = meta(html, /<meta name="description" content="([^"]*)"/);
  row.canonical = meta(html, /<link rel="canonical" href="([^"]*)"/);
  row.ogImage = meta(html, /<meta property="og:image" content="([^"]*)"/);
  row.noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  row.jsonld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (res.status === 200) {
    if (!row.title) problems.push(`${path}: no title`); else if (row.title.length > 60) problems.push(`${path}: title is ${row.title.length} characters: "${row.title}"`);
    // Pages that say noindex need no description or canonical.
    if (!row.noindex) {
      if (!row.description) problems.push(`${path}: no description`); else if (row.description.length < 70 || row.description.length > 160) problems.push(`${path}: description is ${row.description.length} characters`);
      if (!row.canonical) problems.push(`${path}: no canonical`);
    }
    if (!row.ogImage) problems.push(`${path}: no og:image`);
    else { const img = new URL(row.ogImage, base); const r = await fetch(base + img.pathname + img.search); // the image is fetched from the site under test, not the configured site URL
       if (r.status !== 200) problems.push(`${path}: og:image returned ${r.status}`); await r.arrayBuffer(); }
    for (const [i, raw] of row.jsonld.entries()) { try { JSON.parse(raw); } catch (e) { problems.push(`${path}: JSON-LD block ${i + 1} does not parse (${e.message})`); } }
  }
  rows.push(row);
}
for (const key of ["title", "description"]) {
  const seen = new Map();
  for (const r of rows) if (r[key]) (seen.get(r[key]) ?? seen.set(r[key], []).get(r[key])).push(r.path);
  for (const [value, list] of seen) if (list.length > 1) problems.push(`duplicate ${key} "${value.slice(0, 60)}" on ${list.join(", ")}`);
}
console.log(JSON.stringify({ checked: rows.length, problems }, null, 1));
if (process.env.SEO_TABLE) console.log(rows.map((r) => [r.path, r.status, (r.title ?? "").length, (r.description ?? "").length, r.canonical ? "yes" : "NO", r.ogImage ? "yes" : "NO", r.jsonld.length].join(" | ")).join("\n"));
process.exit(problems.length ? 1 : 0);
