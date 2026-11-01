import type { AuthorStorage } from "../lib/author-media-api";
export const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xf7sAAAAASUVORK5CYII=",
  "base64",
);
export const pdf = Buffer.from(
  "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
export function memoryAuthorStorage() {
  const objects = new Map<string, Uint8Array>();
  let failPut = false,
    failDelete = false,
    reads = 0;
  const storage: AuthorStorage = {
    async put(path, bytes) {
      objects.set(path, new Uint8Array(bytes));
      if (failPut) throw Error("Isolated storage PUT failed");
    },
    async get(path) {
      reads++;
      const value = objects.get(path);
      return value ? new Uint8Array(value) : null;
    },
    async del(path) {
      if (failDelete) throw Error("Isolated storage DELETE failed");
      objects.delete(path);
    },
  };
  return {
    storage,
    objects,
    get reads() {
      return reads;
    },
    set failPut(value: boolean) {
      failPut = value;
    },
    set failDelete(value: boolean) {
      failDelete = value;
    },
  };
}
