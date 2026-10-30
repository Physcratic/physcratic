import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        concept:
          "border-border bg-card text-card-foreground text-sm font-normal",
        ipho: "border-primary/30 bg-primary/15 text-accent-foreground text-sm",
        apho: "border-[hsl(var(--elo-intermediate)/0.3)] bg-[hsl(var(--elo-intermediate)/0.12)] text-[hsl(var(--elo-intermediate))] text-sm",
        eupho:
          "border-[hsl(var(--elo-foundation)/0.3)] bg-[hsl(var(--elo-foundation)/0.12)] text-[hsl(var(--elo-foundation))] text-sm",
        "elo-foundation":
          "border-[hsl(var(--elo-foundation)/0.25)] bg-[hsl(var(--elo-foundation)/0.12)] text-[hsl(var(--elo-foundation))]",
        "elo-intermediate":
          "border-[hsl(var(--elo-intermediate)/0.25)] bg-[hsl(var(--elo-intermediate)/0.12)] text-[hsl(var(--elo-intermediate))]",
        "elo-advanced":
          "border-[hsl(var(--elo-advanced)/0.25)] bg-[hsl(var(--elo-advanced)/0.12)] text-[hsl(var(--elo-advanced))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
