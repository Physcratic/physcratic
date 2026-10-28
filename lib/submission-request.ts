export class RequestBodyTimeoutError extends Error {
  constructor() {
    super("Request body timed out");
    this.name = "RequestBodyTimeoutError";
  }
}

export async function readRequestBytes(request: Request, maxBytes: number, timeoutMs = 15000): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Empty request body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RequestBodyTimeoutError());
      void reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new RangeError("Request body is too large");
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return body;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function readSubmissionJson(request: Request, maxBytes = 100000): Promise<unknown> {
  const bytes = await readRequestBytes(request, maxBytes);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function readSubmissionForm(request: Request, maxBytes: number): Promise<FormData> {
  const bytes = await readRequestBytes(request, maxBytes);
  return new Response(bytes as BodyInit, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}
