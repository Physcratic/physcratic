import type { ReactNode } from "react";
import { ReplayTours } from "@/components/tour/tour-help";

// The tours card sits under the account settings. It is a layout so the settings page itself stays as it is.
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ReplayTours />
    </>
  );
}
