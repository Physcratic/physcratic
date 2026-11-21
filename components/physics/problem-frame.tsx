import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * The frame both problem pages share. The main column holds the document tabs, and the answer column sits beside it
 * from xl up (23rem) and below it on a narrow screen, so the answer area always comes after the statement.
 */
export function ProblemFrame({ document, answer }: { document: ReactNode; answer: ReactNode }) {
  return <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">{document}{answer}</div>;
}

type DocumentTabsProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  statementLabel: ReactNode;
  /** The Worked solution tab appears only when a solution is given. */
  solutionLabel?: ReactNode;
  solutionTour?: string;
  listLabel?: string;
  statement: ReactNode;
  solution?: ReactNode;
};

/** The Statement and Worked solution tabs. The statement stays mounted, so what a person typed beside it is kept. */
export function ProblemDocumentTabs({ id, value, onValueChange, statementLabel, solutionLabel, solutionTour, listLabel, statement, solution }: DocumentTabsProps) {
  const hasSolution = solutionLabel !== undefined;
  return <Tabs id={id} tabIndex={id ? -1 : undefined} value={hasSolution ? value : "statement"} onValueChange={onValueChange} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
    <TabsList aria-label={listLabel} className="h-auto w-fit max-w-full flex-wrap">
      <TabsTrigger className="min-h-11" value="statement">{statementLabel}</TabsTrigger>
      {hasSolution && <TabsTrigger className="min-h-11" value="solution" data-tour={solutionTour}>{solutionLabel}</TabsTrigger>}
    </TabsList>
    <TabsContent value="statement" forceMount className="min-w-0 data-[state=inactive]:hidden"><div className="flex min-w-0 flex-col gap-6">{statement}</div></TabsContent>
    {hasSolution && <TabsContent value="solution" className="min-w-0 data-[state=inactive]:hidden"><div className="flex min-w-0 flex-col gap-6">{solution}</div></TabsContent>}
  </Tabs>;
}

/** One document in the frame: a flat card with a heading and one line of context. */
export function DocumentCard({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return <Card className="min-w-0 shadow-none"><CardHeader><CardTitle><h2>{title}</h2></CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="min-w-0">{children}</CardContent></Card>;
}
