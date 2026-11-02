import { submissionLimits, type SubmissionEvidence } from "./solution-grading";

export function detectSubmissionMedia(bytes: Uint8Array): SubmissionEvidence["mediaType"] | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}
export function evidenceMatches(submitted: SubmissionEvidence, stored: { id: string; mediaType: string; bytes: number; sha256: string }) {
  return submitted.id === stored.id && submitted.mediaType === stored.mediaType && submitted.bytes === stored.bytes && submitted.sha256 === stored.sha256;
}
export function isAllowedSubmissionOrigin(request: Request, configured: readonly (string | undefined)[]) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null" || request.headers.get("sec-fetch-site") === "cross-site") return false;
  return configured.some((value) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.origin === origin;
    } catch {
      return false;
    }
  });
}
export function safeReturnPath(value: unknown) {
  return typeof value === "string" && /^\/(?:dashboard(?:[/?]|$)|settings(?:[?]|$))/.test(value) && !/[\\\u0000-\u001f]/.test(value) ? value : "/dashboard/submissions";
}
export function validUploadSize(bytes: number) {
  return Number.isSafeInteger(bytes) && bytes > 0 && bytes <= submissionLimits.maxFileBytes;
}
