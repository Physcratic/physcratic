import { get, put, del } from "@vercel/blob";
import type { AuthorStorage } from "./author-media-api";
// Never return SDK URLs, allow public storage, or overwrite an existing object.
export const privateAuthorStorage: AuthorStorage = {
  async put(path, bytes, contentType) {
    await put(path, Buffer.from(bytes), {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      abortSignal: AbortSignal.timeout(10000),
    });
  },
  async get(path) {
    const result = await get(path, {
      access: "private",
      abortSignal: AbortSignal.timeout(10000),
    });
    return result?.statusCode === 200 ? result.stream : null;
  },
  async del(path) {
    await del(path, { abortSignal: AbortSignal.timeout(10000) });
  },
};
