// Binary signature/structure checks, never filename-based trust or SVG/HTML hosting.
import { detectSubmissionMedia } from "./submission-security";
export function detectAuthorMedia(bytes: Uint8Array): string | null {
  const type = detectSubmissionMedia(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  const dimensions = (w: number, h: number) =>
    w > 0 && h > 0 && w <= 12000 && h <= 12000 && w * h <= 40_000_000;
  if (type === "application/pdf")
    return /^%PDF-(?:1\.[0-9]|2\.0)[\r\n]/.test(ascii(0, 12)) &&
      /%%EOF\s*$/.test(ascii(Math.max(0, bytes.length - 1024), bytes.length))
      ? type
      : null;
  if (type === "image/png" && bytes.length >= 57) {
    if (
      view.getUint32(8) !== 13 ||
      ascii(12, 16) !== "IHDR" ||
      !dimensions(view.getUint32(16), view.getUint32(20))
    )
      return null;
    let offset = 8,
      data = false;
    while (offset + 12 <= bytes.length) {
      const size = view.getUint32(offset),
        kind = ascii(offset + 4, offset + 8);
      if (size > bytes.length - offset - 12) return null;
      if (kind === "IHDR" && offset !== 8) return null;
      if (kind === "IDAT") data = true;
      if (kind === "IEND")
        return size === 0 && offset + 12 === bytes.length && data ? type : null;
      offset += size + 12;
    }
  }
  if (
    type === "image/jpeg" &&
    bytes.length >= 12 &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217
  ) {
    let offset = 2,
      valid = false;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (offset < bytes.length && bytes[offset] === 255) offset++;
      if (offset + 3 > bytes.length) return null;
      const marker = bytes[offset++];
      if (marker === 218) return valid ? type : null;
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) return null;
      if ([192, 193, 194].includes(marker)) {
        if (size < 8) return null;
        valid = dimensions(
          view.getUint16(offset + 5),
          view.getUint16(offset + 3),
        );
      }
      offset += size;
    }
  }
  if (
    type === "image/webp" &&
    bytes.length >= 30 &&
    view.getUint32(4, true) === bytes.length - 8
  ) {
    let offset = 12,
      frame = false;
    let declared: string | undefined;
    let actual: string | undefined;
    const u24 = (n: number) =>
      bytes[n] + (bytes[n + 1] << 8) + (bytes[n + 2] << 16);
    while (offset + 8 <= bytes.length) {
      const chunk = ascii(offset, offset + 4),
        size = view.getUint32(offset + 4, true),
        data = offset + 8;
      if (size > bytes.length - data) return null;
      if (chunk === "ANIM" || chunk === "ANMF") return null;
      if (chunk === "VP8X") {
        if (size !== 10 || bytes[data] & 2) return null;
        const w = u24(data + 4) + 1,
          h = u24(data + 7) + 1;
        if (!dimensions(w, h)) return null;
        declared = `${w}:${h}`;
      }
      if (chunk === "VP8 ") {
        if (size < 10 || ascii(data + 3, data + 6) !== "\x9d\x01\x2a")
          return null;
        const w = view.getUint16(data + 6, true) & 16383,
          h = view.getUint16(data + 8, true) & 16383;
        if (!dimensions(w, h)) return null;
        actual = `${w}:${h}`;
        frame = true;
      }
      if (chunk === "VP8L") {
        if (size < 5 || bytes[data] !== 47) return null;
        const bits = view.getUint32(data + 1, true),
          w = (bits & 16383) + 1,
          h = ((bits >>> 14) & 16383) + 1;
        if (!dimensions(w, h)) return null;
        actual = `${w}:${h}`;
        frame = true;
      }
      offset += 8 + size + (size % 2);
    }
    return offset === bytes.length &&
      frame &&
      (!declared || declared === actual)
      ? type
      : null;
  }
  return null;
}
