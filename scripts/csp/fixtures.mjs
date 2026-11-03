// Synthetic 2x2 solid-colour JPEG2000 image (OpenJPEG). No corpus/private data.
export function codecPdf() {
  const image = Buffer.from('AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAAAgAAAAIAAwcHAAAAAAAPY29scgEAAAAAABAAAACaanAyY/9P/1EALwAAAAAAAgAAAAIAAAAAAAAAAAAAAAIAAAACAAAAAAAAAAAAAwcBAQcBAQcBAf9SAAwAAAABAAEEBAAB/1wAB0BASEhQ/2QAJQABQ3JlYXRlZCBieSBPcGVuSlBFRyB2ZXJzaW9uIDIuNS40/5AACgAAAAAAHwAB/5PPtAgIH8PnBAMfx9QCCICAgP/Z', 'base64');
  const drawing = 'q 20 0 0 20 0 0 cm /Im0 Do Q';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 20 20] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /JPXDecode /Length ${image.length} >>\nstream\n`), image, Buffer.from('\nendstream')]),
    `<< /Length ${drawing.length} >>\nstream\n${drawing}\nendstream`,
  ];
  const chunks = [Buffer.from('%PDF-1.7\n')], offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${i + 1} 0 obj\n`), Buffer.from(objects[i]), Buffer.from('\nendobj\n'));
  }
  const xref = Buffer.concat(chunks).length;
  chunks.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return Buffer.concat(chunks);
}
