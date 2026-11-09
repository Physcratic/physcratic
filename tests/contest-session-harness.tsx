import { createRoot } from "react-dom/client";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import { authClient } from "@/lib/auth-client";
import { fetchJson } from "@/lib/api-client";
import { ContestRoom } from "@/components/contests/contest-room";
import { ContestAdmin } from "@/components/contests/contest-admin";

declare global {
  interface Window { refreshContestAccount: () => void }
}

function Harness() {
  const { data } = authClient.useSession();
  const { mutate } = useSWRConfig();
  useSWR("/api/dashboard", fetchJson);
  window.refreshContestAccount = () => {
    authClient.$store.notify("$sessionSignal");
    void mutate(() => true);
  };
  return <>
    <p id="viewer">{data?.user.id ?? "guest"}</p>
    {location.pathname === "/manage" ? <ContestAdmin /> : <ContestRoom id="fixture" />}
  </>;
}

createRoot(document.getElementById("root")!).render(
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    <Harness />
  </SWRConfig>,
);
