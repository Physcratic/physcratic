import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const nonceSize = 12;
const tagSize = 16;
const positionSizes = { pc2: 256, ph1: 160 } as const;
type CursorVersion = keyof typeof positionSizes;

function cursorKey(secret: string, version: string) {
  return createHmac("sha256", secret).update(`physcratic:completion-cursor:${version}`).digest();
}

export function sealCompletionCursor(secret: string, version: CursorVersion, scope: readonly string[], position: unknown) {
  const nonce = randomBytes(nonceSize);
  const cipher = createCipheriv("aes-256-gcm", cursorKey(secret, version), nonce);
  cipher.setAAD(Buffer.from(JSON.stringify(scope)));
  // Fixed lengths keep request logs from revealing position fields through token size.
  const encoded = Buffer.from(JSON.stringify(position));
  const plaintext = Buffer.alloc(positionSizes[version], 0x20);
  if (encoded.length > plaintext.length) throw Error("Invalid completion cursor size");
  encoded.copy(plaintext);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return `${version}.${Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]).toString("base64url")}`;
}

export function openCompletionCursor(secret: string, version: CursorVersion, scope: readonly string[], token: string): unknown {
  if (!token.startsWith(`${version}.`)) return null;
  const encoded = token.slice(version.length + 1);
  const packed = Buffer.from(encoded, "base64url");
  if (packed.length !== nonceSize + positionSizes[version] + tagSize || packed.toString("base64url") !== encoded) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", cursorKey(secret, version), packed.subarray(0, nonceSize));
    decipher.setAAD(Buffer.from(JSON.stringify(scope)));
    decipher.setAuthTag(packed.subarray(-tagSize));
    const plaintext = Buffer.concat([decipher.update(packed.subarray(nonceSize, -tagSize)), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch {
    return null;
  }
}
