import Link from "next/link";
import { notFound } from "next/navigation";
import { specimens, sourceUrl, examplePath } from "../catalog";
import { PreviewControls } from "../preview-controls";

export function generateStaticParams() { return specimens.map(({ id }) => ({ id })); }
export default async function SpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = specimens.find(entry => entry.id === id);
  if (!item) notFound();
  return <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">
    <Link href="/workshop" className="inline-flex min-h-11 items-center underline underline-offset-4">Back to component directory</Link>
    <header className="space-y-3"><h1 className="text-3xl font-semibold">{item.title}</h1><p className="max-w-3xl text-muted-foreground">{item.note}</p></header>
    <dl className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
      <div><dt className="font-semibold">Contains</dt><dd className="mt-2 text-sm leading-relaxed">{item.parts}</dd></div>
      <div><dt className="font-semibold">States to review</dt><dd className="mt-2 text-sm leading-relaxed">{item.states}</dd></div>
    </dl>
    <div className="flex flex-wrap gap-x-6"><a href={sourceUrl(item.source)} className="inline-flex min-h-11 items-center break-all underline underline-offset-4">Source at extraction</a><Link href={examplePath} className="inline-flex min-h-11 items-center underline underline-offset-4">Used on the problem page</Link></div>
    <PreviewControls specimen={item.id} />
    <section aria-labelledby="proposal-heading" className="space-y-3 rounded-xl border border-dashed p-5"><h2 id="proposal-heading" className="text-xl font-semibold">Proposed changes</h2><p>No replacement approved yet. Discuss this entry by its name and state, then add a separate candidate preview here.</p></section>
    <nav aria-label="Connected components" className="space-y-2"><h2 className="text-xl font-semibold">Connected components</h2><ul className="flex flex-wrap gap-x-6">{item.related.map(key => <li key={key}><Link href={`/workshop/${key}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{specimens.find(entry => entry.id === key)?.title}</Link></li>)}</ul></nav>
  </main>;
}
