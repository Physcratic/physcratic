import "server-only";
import { get, put, del } from "@vercel/blob";
import { getVercelOidcToken } from "@vercel/oidc";

export interface ProfileMediaStorage {
  put(path: string, bytes: Uint8Array): Promise<void>;
  get(path: string): Promise<ReadableStream<Uint8Array> | null>;
  del(path: string): Promise<void>;
}
// Separate namespace and explicit existing private-store binding. No authoring storage changes.
export function createPrivateProfileStorage({ sdk = { get, put, del }, env = (): Record<string, string | undefined> => process.env,
  oidc = getVercelOidcToken } = {}): ProfileMediaStorage {
  async function options(path: string) {
    const storeId = env().COMMUNITY_PROFILE_BLOB_STORE_ID;
    if (!storeId || !/^store_[A-Za-z0-9]+$/.test(storeId) ||
      !/^community-profile-media\/[0-9a-f-]{36}\.webp$/.test(path)) throw new Error("Profile image storage unavailable");
    const oidcToken = await oidc();
    if (!oidcToken) throw new Error("Profile image storage unavailable");
    return { storeId, oidcToken, abortSignal: AbortSignal.timeout(10000) };
  }
  return {
    async put(path, bytes) {
      await sdk.put(path, Buffer.from(bytes), { ...await options(path), access: "private",
        contentType: "image/webp", addRandomSuffix: false, allowOverwrite: false });
    },
    async get(path) {
      const result = await sdk.get(path, { ...await options(path), access: "private" });
      return result?.statusCode === 200 ? result.stream : null;
    },
    async del(path) { await sdk.del(path, await options(path)); },
  };
}
