"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  /** One plain sentence about what happens. */
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** A destructive action. The sheet shows a warning icon and the danger colour, and focus starts on Cancel. */
  danger?: boolean;
};
type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<Ask | null>(null);

/** Ask before a Studio action. Resolves true on the confirm button and false on Cancel, Escape or the backdrop. */
export function useConfirm(): Ask {
  const ask = React.useContext(ConfirmContext);
  if (!ask) return () => Promise.reject(new Error("useConfirm needs a ConfirmProvider above it."));
  return ask;
}

/** One confirm for the whole of Problem Studio. A bottom sheet on a phone and a centred dialog from sm up. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<((value: boolean) => void) | null>(null);
  const confirmButton = React.useRef<HTMLButtonElement>(null);
  const opener = React.useRef<HTMLElement | null>(null);
  const settle = React.useCallback((value: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOptions(null);
    resolve?.(value);
  }, []);
  const ask = React.useCallback<Ask>((next) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    // Radix returns focus to a Trigger, and this sheet opens from code, so it remembers the control that had focus.
    opener.current = document.activeElement as HTMLElement | null;
    setOptions(next);
  }), []);
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => { if (!open) settle(false); }}>
        {options && (
          <AlertDialogPortal>
            <AlertDialogOverlay onClick={() => settle(false)} />
            <AlertDialogPrimitive.Content
              data-confirm-sheet
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (opener.current?.isConnected) opener.current.focus();
              }}
              onOpenAutoFocus={(event) => {
                // Radix focuses Cancel. A plain confirm starts on its main action instead.
                if (!options.danger) {
                  event.preventDefault();
                  confirmButton.current?.focus();
                }
              }}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 grid gap-4 rounded-t-2xl border-t bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg",
                "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:p-6",
              )}
            >
              <div className="space-y-2">
                <AlertDialogTitle className="flex items-start gap-2 text-lg font-semibold">
                  {options.danger && <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger-ink" />}
                  <span>{options.title}</span>
                </AlertDialogTitle>
                {options.message ? <AlertDialogDescription className="text-base text-muted-foreground">{options.message}</AlertDialogDescription> : <AlertDialogDescription className="sr-only">{options.title}</AlertDialogDescription>}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <AlertDialogPrimitive.Cancel asChild>
                  <Button type="button" variant="outline" data-confirm-cancel className="min-h-11 border-2 text-base" onClick={() => settle(false)}>
                    {options.cancelLabel ?? "Cancel"}
                  </Button>
                </AlertDialogPrimitive.Cancel>
                <AlertDialogPrimitive.Action asChild>
                  <Button
                    ref={confirmButton}
                    type="button"
                    data-confirm-action
                    className={cn("min-h-11 text-base", options.danger && "bg-danger text-danger-foreground hover:bg-danger/90")}
                    onClick={() => settle(true)}
                  >
                    {options.confirmLabel}
                  </Button>
                </AlertDialogPrimitive.Action>
              </div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPortal>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
