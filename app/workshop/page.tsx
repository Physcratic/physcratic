import Link from "next/link";
import { specimens, examplePath } from "./catalog";
import { SkipLink } from "@/components/skip-link";

export default function WorkshopPage() {
  return <>
    <SkipLink targetId="workshop-main">Skip to workshop</SkipLink>
    <main id="workshop-main" className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="space-y-3">
        <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">Physcratic</Link>
        <h1 className="text-3xl font-semibold tracking-tight">UI workshop</h1>
        <p className="max-w-2xl text-muted-foreground">Inspect the existing pieces, test their states, and discuss changes before applying them to the website.</p>
      </header>
      <section aria-labelledby="sample-title" className="space-y-3 rounded-xl border bg-card p-5">
        <h2 id="sample-title" className="text-xl font-semibold">Sample: problem-solving page</h2>
        <p>This first extraction covers Walking Past Two Speakers, not the entire website.</p>
        <Link href={examplePath} className="inline-flex min-h-11 items-center underline underline-offset-4">Open the original page</Link>
        <p className="text-sm text-muted-foreground">Each entry connects a larger composition to its smaller pieces. Shared-component previews are live. Answer checking is a local demonstration.</p>
      </section>
      <section aria-labelledby="directory-title" className="space-y-4">
        <h2 id="directory-title" className="text-xl font-semibold">Component directory</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specimens.map(item => <li key={item.id} className="min-w-0 space-y-2 rounded-xl border bg-card p-5">
            <Link href={`/workshop/${item.id}`} className="inline-flex min-h-11 items-center text-lg font-semibold underline underline-offset-4">{item.title}</Link>
            <p className="text-sm text-muted-foreground">{item.kind}</p>
            <p className="text-sm leading-relaxed">{item.parts}</p>
          </li>)}
        </ul>
      </section>
    </main>
  </>;
}
