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
        // One colour for each rating band. The tokens are in app/globals.css and keep 4.5:1 text on their tint in both themes.
        "band-beginner":
          "border-[hsl(var(--band-beginner)/0.3)] bg-[hsl(var(--band-beginner)/0.12)] text-[hsl(var(--band-beginner))]",
        "band-intermediate":
          "border-[hsl(var(--band-intermediate)/0.3)] bg-[hsl(var(--band-intermediate)/0.12)] text-[hsl(var(--band-intermediate))]",
        "band-advanced":
          "border-[hsl(var(--band-advanced)/0.3)] bg-[hsl(var(--band-advanced)/0.12)] text-[hsl(var(--band-advanced))]",
        "band-mastery":
          "border-[hsl(var(--band-mastery)/0.3)] bg-[hsl(var(--band-mastery)/0.12)] text-[hsl(var(--band-mastery))]",
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
