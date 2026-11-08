import React from "react";
import Link from "next/link";
export default function ProfileNotFound() {
  return <main className="mx-auto max-w-xl space-y-5 px-5 py-20"><h1 className="text-2xl font-semibold">Profile not found</h1><p className="text-sm leading-6 text-muted-foreground">This profile is not available.</p><Link href="/dashboard" className="inline-flex min-h-11 items-center rounded text-sm underline underline-offset-4">Back to Arena</Link></main>;
}
