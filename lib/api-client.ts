export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "The service is unavailable. Please retry.",
    );
  return result as T;
}
