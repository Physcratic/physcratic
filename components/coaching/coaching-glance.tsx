import { content } from "@/lib/coaching/content";
import { Clock, GraduationCap, Languages, Layers, Trophy, Users, Video, Wallet } from "lucide-react";

const { glance } = content;
const quickFacts = [0, 1, 2, 6];
const detailFacts = [3, 4, 5, 7];
const icons = [Video, Users, Clock, Trophy, GraduationCap, Layers, Wallet, Languages];

export function CoachingGlance() {
  return <section aria-labelledby="glance-title" className="border-b border-border py-20">
    <div className="coaching-container">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-5 sm:px-8">
          <h2 id="glance-title" className="text-2xl font-semibold tracking-tight">Coaching at a Glance</h2>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-b bg-muted/40 px-5 py-6 sm:px-8 lg:grid-cols-4">
          {quickFacts.map(index => {
            const item = glance.items[index];
            const Icon = icons[index];
            return <div key={item.term} className="min-w-0 space-y-2">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4 shrink-0" aria-hidden="true" />{item.term}</dt>
              <dd className="text-base font-semibold leading-snug sm:text-lg">{item.detail}</dd>
            </div>;
          })}
        </dl>
        <dl className="grid gap-x-10 gap-y-6 px-5 py-6 sm:px-8 md:grid-cols-2">
          {detailFacts.map(index => {
            const item = glance.items[index];
            const Icon = icons[index];
            return <div key={item.term} className="min-w-0 space-y-1">
              <dt className="flex items-center gap-3 font-semibold"><Icon className="size-5 shrink-0 text-accent" aria-hidden="true" />{item.term}</dt>
              <dd className="pl-8 text-sm leading-relaxed text-muted-foreground sm:text-base">{item.detail}</dd>
            </div>;
          })}
        </dl>
      </div>
    </div>
  </section>;
}
