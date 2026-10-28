import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const manifestPath = resolve("lib/corpus/catalog-sources.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    checkedOn: string;
    verification: string;
    checks: { url: string; status: string }[];
    problems: {
      checkedOn: string;
      statementUrl: string;
      solutionUrl: string;
    }[];
  };
  const urls = [
    ...new Set(
      manifest.problems
        .flatMap(({ statementUrl, solutionUrl }) => [statementUrl, solutionUrl])
        .filter((url) => url.startsWith("https://")),
    ),
  ];
  const results: { url: string; status: string; error?: string }[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex++];
      try {
        const document =
          url.includes("/download/") || new URL(url).pathname.endsWith(".pdf");
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PhyscraticSourceAudit/1.0)",
            ...(document ? { Range: "bytes=0-1023" } : {}),
          },
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (document) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Missing document body");
          const chunk = await reader.read();
          await reader.cancel();
          const header = Buffer.from(chunk.value ?? [])
            .subarray(0, 5)
            .toString();
          if (!header.startsWith("%PDF") && !header.startsWith("PK"))
            throw new Error("Expected a PDF or ZIP document");
        } else if (url.includes("pho.rs/p/")) {
          const html = await response.text();
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ");
          if (
            text.length < 800 ||
            text.includes(
              "Авторизация Светлая сторона силы Забыли пароль? Войти",
            )
          )
            throw new Error("Missing source body or sign-in wall");
          if (url.endsWith("/s") && !text.includes("Решение"))
            throw new Error("Missing solution label");
        } else await response.body?.cancel();
        results.push({
          url,
          status: document
            ? "document-header-checked"
            : url.includes("pho.rs/p/")
              ? "html-body-checked"
              : "http-ok",
        });
      } catch (error) {
        results.push({
          url,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: 5 }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));
  const failed = results.filter((result) => result.status === "failed");
  console.log(JSON.stringify({ checked: results.length, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
  else if (process.argv.includes("--write")) {
    const checkedOn = new Date().toISOString().slice(0, 10);
    await writeFile(
      manifestPath,
      `${JSON.stringify({ ...manifest, checkedOn, checks: results, problems: manifest.problems.map((problem) => ({ ...problem, checkedOn })) }, null, 2)}\n`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
