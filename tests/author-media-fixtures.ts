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

// A real two-page, selectable-text PDF for the existing PDF.js renderer. No external files or services.
export function statementPdfFixture() {
  const stream = (text: string) => {
    const data = `BT /F1 18 Tf 40 180 Td (${text}) Tj ET`;
    return `<< /Length ${Buffer.byteLength(data)} >>\nstream\n${data}\nendstream`;
  };
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 240] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 240] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    stream('Synthetic statement page one'), stream('Synthetic statement page two'),
  ];
  let data = '%PDF-1.7\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(data)); data += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(data);
  data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(data + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
