"use client";
import { Button } from "@/components/ui/button";

/** Stops a published problem being public. `onUnpublish` asks for confirmation and sends the request. */
export function UnpublishZone({ disabled, onUnpublish }: { disabled: boolean; onUnpublish: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-destructive p-4">
    <h3 className="text-sm font-semibold">Danger zone</h3>
    <p className="text-sm text-muted-foreground">
      Unpublishing stops the problem being publicly readable.
      Previous revisions stay retained.
    </p>
    <Button
      type="button"
      variant="outline"
      className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={disabled}
      onClick={onUnpublish}
    >
      Unpublish problem
    </Button>
    </div>
  );
}
