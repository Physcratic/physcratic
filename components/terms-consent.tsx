"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { TermsContent } from "@/components/terms-content";

export function TermsConsent({ checked, onChange, invalid = false }: { checked: boolean; onChange: (checked: boolean) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="flex flex-col gap-2">
    <div className="flex items-start gap-3">
      <Checkbox id="account-terms" name="termsAccepted" required checked={checked} onCheckedChange={(value) => onChange(value === true)} aria-labelledby="account-terms-label" aria-describedby="account-terms-description" aria-invalid={invalid} className="mt-1 h-5 w-5" onInvalid={() => onChange(false)} />
      <div>
        <span id="account-terms-label"><label htmlFor="account-terms">I have read and agree to the </label><Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><button type="button" className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2">Terms of Service</button></DialogTrigger>
          <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden">
            <DialogHeader className="shrink-0 pr-6">
              <DialogTitle>Terms of Service</DialogTitle>
              <DialogDescription>Review the Terms below before continuing.</DialogDescription>
            </DialogHeader>
            <div tabIndex={0} aria-label="Complete Terms of Service" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 focus-visible:outline focus-visible:outline-2">
              <TermsContent idPrefix="signup-terms-" />
            </div>
            <DialogFooter className="shrink-0 gap-2">
              <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
              <Button type="button" onClick={() => { onChange(true); setOpen(false); }}>I agree</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>.</span>
        <p id="account-terms-description" className="mt-1 text-xs text-muted-foreground">Required.</p>
      </div>
    </div>
    {invalid && <p role="alert" className="text-sm text-destructive">Please read and agree to the Terms of Service before creating an account.</p>}
  </div>;
}
