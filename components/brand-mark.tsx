import { cn } from "@/lib/utils";

/**
 * Decorative brand mark with explicit size, never preloaded. The pale mark
 * reads on dark. On light backgrounds it looks washed out, so the light theme
 * uses the stronger #4F86FF icon instead. Lazy loading means the image hidden
 * by the current theme is never fetched.
 */
export function BrandMark({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  const shared = {
    width: size,
    height: size,
    alt: "",
    "aria-hidden": true,
    loading: "lazy",
    decoding: "async",
    fetchPriority: "low",
  } as const;
  return (
    <>
      {/* eslint-disable @next/next/no-img-element */}
      <img
        {...shared}
        alt=""
        src="/logo-mark-transparent.png"
        className={cn("hidden dark:block", className)}
      />
      <img
        {...shared}
        alt=""
        src="/icon-512.png"
        className={cn("block dark:hidden", className)}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </>
  );
}
