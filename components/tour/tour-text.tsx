import { Fragment } from "react";

/** Tour text marks a key as [[$]]. It is shown as a key chip with a translucent highlight. */
export function TourText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\[\[(.+?)\]\]/).map((part, index) =>
        index % 2 === 1 ? (
          <kbd key={index} className="mx-0.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded-md border border-primary/70 bg-primary/25 px-1.5 font-mono text-sm font-semibold text-foreground">
            {part}
          </kbd>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** The words a screen reader or a test sees: the text without the key markers. */
export const plainTourText = (text: string) => text.replace(/\[\[(.+?)\]\]/g, "$1");
