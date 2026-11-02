import { siteUrl } from "./site";
import { authoringStagingOrigin } from "./authoring-staging";

// Discovery files describe the public site. The isolated Preview keeps its own
// metadata/auth origin, while these URLs point to the canonical public pages.
export function publicDiscoveryUrl(): string {
  const origin = siteUrl();
  return process.env.VERCEL_ENV === "preview" && origin === authoringStagingOrigin
    ? "https://physcratic.com"
    : origin;
}
