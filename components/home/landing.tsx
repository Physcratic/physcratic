import Dashboard from "@/components/kokonutui/dashboard";

/** Guests use the same Lobby navigation and topic browsing as members. */
export function HomeLanding() {
  return <Dashboard view="overview" />;
}
