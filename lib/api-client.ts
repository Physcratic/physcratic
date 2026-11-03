import type { SWRConfiguration } from "swr";

export const API_READ_TIMEOUT_MS = 20_000;
export const API_WRITE_TIMEOUT_MS = 60_000;

type ApiFailure = "http" | "network" | "timeout" | "invalid-response";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly kind: ApiFailure,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function shouldRetryApiRead(error: unknown) {
  if (!(error instanceof ApiRequestError)) return false;
  if (error.kind === "network" || error.kind === "timeout") return true;
  // Rate limits need the server's cooldown, not a blind background retry.
  return (
    error.kind === "http" &&
    (error.status === 408 ||
      (error.status !== undefined && error.status >= 500 && error.status < 600))
  );
}

export const apiReadSWRConfig = {
  errorRetryCount: 2,
  errorRetryInterval: 5_000,
  shouldRetryOnError: shouldRetryApiRead,
} satisfies SWRConfiguration;

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const callerSignal = init?.signal;
  callerSignal?.throwIfAborted();
  const controller = new AbortController();
  const timeoutReason = new DOMException("Request deadline exceeded", "TimeoutError");
  const isRead = ["GET", "HEAD"].includes((init?.method ?? "GET").toUpperCase());
  const timer = setTimeout(
    () => controller.abort(timeoutReason),
    isRead ? API_READ_TIMEOUT_MS : API_WRITE_TIMEOUT_MS,
  );
  const cancel = () => controller.abort(callerSignal?.reason);
  callerSignal?.addEventListener("abort", cancel, { once: true });

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      if (response.ok)
        throw new ApiRequestError(
          isRead
            ? "The service returned an unreadable response. Please retry."
            : "The service returned an unreadable response. Changes may have been saved. Check before retrying.",
          "invalid-response",
          response.status,
        );
    }
    if (!response.ok)
      throw new ApiRequestError(
        result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "The service is unavailable. Please retry.",
        "http",
        response.status,
      );
    return result as T;
  } catch (error) {
    if (controller.signal.aborted) {
      if (controller.signal.reason !== timeoutReason) throw controller.signal.reason;
      throw new ApiRequestError(
        isRead
          ? "The request took too long. Please retry."
          : "The request timed out. Changes may have been saved. Check before retrying.",
        "timeout",
      );
    }
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(
      isRead
        ? "Could not connect to the service. Check your connection and retry."
        : "The connection was interrupted. Changes may have been saved. Check before retrying.",
      "network",
    );
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", cancel);
  }
}
