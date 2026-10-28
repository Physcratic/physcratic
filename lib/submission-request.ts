export async function readSubmissionJson(request: Request, maxBytes = 100000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Empty submission body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new RangeError("Submission body is too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}
