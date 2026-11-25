import { AttemptsPageShell } from "@/components/physics/attempts-page-shell";
import { LoadingLines } from "@/components/loading-lines";
export default function LoadingAttempts() {
  return <AttemptsPageShell><LoadingLines label="Loading your private attempts." /></AttemptsPageShell>;
}
