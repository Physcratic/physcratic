import test from "node:test";
import assert from "node:assert/strict";
import {
  API_READ_TIMEOUT_MS,
  API_WRITE_TIMEOUT_MS,
  ApiRequestError,
  apiReadSWRConfig,
  fetchJson,
  shouldRetryApiRead,
} from "./api-client";

function waitForAbort(signal: AbortSignal) {
  return new Promise<never>((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

test("JSON requests preserve input options and use uncached same-origin credentials", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    assert.equal(_url, "/api/progress");
    assert.equal(init.method, "POST");
    assert.equal(init.body, '{"answer":42}');
    assert.deepEqual(init.headers, { "Content-Type": "application/json" });
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "same-origin");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ correct: true });
  });
  assert.deepEqual(await fetchJson("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"answer":42}',
    cache: "force-cache",
    credentials: "include",
  }), { correct: true });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("HTTP failures retain status and the server's JSON error message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "Sign in to continue." }, { status: 401 }));
  await assert.rejects(fetchJson("/api/progress"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "http");
    assert.equal(error.status, 401);
    assert.equal(error.message, "Sign in to continue.");
    assert.equal(shouldRetryApiRead(error), false);
    return true;
  });
});

test("HTML error pages are safe HTTP failures, not successful JSON or leaked markup", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<h1>Private proxy details</h1>", { status: 503 }));
  await assert.rejects(fetchJson("/api/dashboard"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "http");
    assert.equal(error.status, 503);
    assert.equal(error.message, "The service is unavailable. Please retry.");
    assert.equal(shouldRetryApiRead(error), true);
    return true;
  });
});

test("malformed and empty successful bodies reject instead of resolving as null", async (t) => {
  for (const body of ["<html>Sign in</html>", "{", ""]) {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(body));
    await assert.rejects(fetchJson("/api/dashboard"), (error: unknown) => {
      assert.ok(error instanceof ApiRequestError);
      assert.equal(error.kind, "invalid-response");
      assert.equal(error.status, 200);
      assert.equal(shouldRetryApiRead(error), false);
      return true;
    });
    fetchMock.mock.restore();
  }
});

test("an unreadable write acknowledgement preserves the uncertain outcome without replaying", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("<html>Proxy reply</html>"));
  await assert.rejects(fetchJson("/api/progress", { method: "POST", body: "{}" }), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "invalid-response");
    assert.match(error.message, /Changes may have been saved/);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("network failures have a recoverable message without browser internals", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch private details"); });
  await assert.rejects(fetchJson("/api/dashboard"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "network");
    assert.match(error.message, /Check your connection/);
    assert.equal(shouldRetryApiRead(error), true);
    return true;
  });
});

test("a stalled read aborts at its deadline without a duplicate request", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal: AbortSignal | undefined;
  const fetchMock = t.mock.method(globalThis, "fetch", (_url: string, init: RequestInit) => {
    requestSignal = init.signal as AbortSignal;
    return waitForAbort(requestSignal);
  });
  const result = assert.rejects(fetchJson("/api/dashboard"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "timeout");
    assert.match(error.message, /Please retry/);
    return true;
  });
  t.mock.timers.tick(API_READ_TIMEOUT_MS - 1);
  assert.equal(requestSignal?.aborted, false);
  t.mock.timers.tick(1);
  await result;
  assert.equal(requestSignal?.aborted, true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("the read deadline also covers a response body that never finishes", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let readingBody!: () => void;
  const bodyStarted = new Promise<void>((resolve) => { readingBody = resolve; });
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => ({
    ok: true,
    status: 200,
    json: () => {
      readingBody();
      return waitForAbort(init.signal as AbortSignal);
    },
  }));
  const result = assert.rejects(fetchJson("/api/dashboard"), (error: unknown) => error instanceof ApiRequestError && error.kind === "timeout");
  await bodyStarted;
  t.mock.timers.tick(API_READ_TIMEOUT_MS);
  await result;
});

test("writes have a longer deadline and warn about an uncertain outcome without replaying", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal: AbortSignal | undefined;
  const fetchMock = t.mock.method(globalThis, "fetch", (_url: string, init: RequestInit) => {
    requestSignal = init.signal as AbortSignal;
    return waitForAbort(requestSignal);
  });
  const result = assert.rejects(fetchJson("/api/progress", { method: "POST", body: "{}" }), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "timeout");
    assert.match(error.message, /Changes may have been saved/);
    return true;
  });
  t.mock.timers.tick(API_READ_TIMEOUT_MS);
  assert.equal(requestSignal?.aborted, false);
  t.mock.timers.tick(API_WRITE_TIMEOUT_MS - API_READ_TIMEOUT_MS);
  await result;
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("a network-disconnected write does not imply changes were discarded or replay them", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new TypeError("offline"); });
  await assert.rejects(fetchJson("/api/progress", { method: "POST", body: "{}" }), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.kind, "network");
    assert.match(error.message, /Changes may have been saved/);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("an already cancelled caller never sends a request", async (t) => {
  const controller = new AbortController();
  const reason = new DOMException("Left the page", "AbortError");
  controller.abort(reason);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({}));
  await assert.rejects(fetchJson("/api/dashboard", { signal: controller.signal }), (error: unknown) => error === reason);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("caller cancellation is forwarded and not converted into a retryable timeout", async (t) => {
  const controller = new AbortController();
  const reason = new DOMException("Left the page", "AbortError");
  t.mock.method(globalThis, "fetch", (_url: string, init: RequestInit) => waitForAbort(init.signal as AbortSignal));
  const result = assert.rejects(fetchJson("/api/dashboard", { signal: controller.signal }), (error: unknown) => {
    assert.equal(error, reason);
    assert.equal(shouldRetryApiRead(error), false);
    return true;
  });
  controller.abort(reason);
  await result;
});

test("settled requests release their deadline and caller listener on success and failure", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const status of [200, 503]) {
    const controller = new AbortController();
    const removeListener = t.mock.method(controller.signal, "removeEventListener");
    let requestSignal: AbortSignal | undefined;
    const fetchMock = t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      requestSignal = init.signal as AbortSignal;
      return Response.json({}, { status });
    });
    const request = fetchJson("/api/dashboard", { signal: controller.signal });
    if (status === 200) await request;
    else await assert.rejects(request);
    assert.equal(removeListener.mock.callCount(), 1);
    t.mock.timers.tick(API_WRITE_TIMEOUT_MS);
    controller.abort();
    assert.equal(requestSignal?.aborted, false);
    fetchMock.mock.restore();
  }
});

test("read retries are finite and exclude permanent errors, rate limits and cancellations", () => {
  assert.equal(apiReadSWRConfig.errorRetryCount, 2);
  assert.equal(apiReadSWRConfig.errorRetryInterval, 5_000);
  assert.equal(apiReadSWRConfig.shouldRetryOnError, shouldRetryApiRead);
  for (const status of [400, 401, 403, 404, 409, 413, 422, 429])
    assert.equal(shouldRetryApiRead(new ApiRequestError("Rejected", "http", status)), false, String(status));
  for (const status of [408, 500, 502, 503, 504])
    assert.equal(shouldRetryApiRead(new ApiRequestError("Unavailable", "http", status)), true, String(status));
  assert.equal(shouldRetryApiRead(new ApiRequestError("Unreadable", "invalid-response", 200)), false);
  assert.equal(shouldRetryApiRead(new Error("Unknown failure")), false);
  assert.equal(shouldRetryApiRead(new DOMException("Cancelled", "AbortError")), false);
});
