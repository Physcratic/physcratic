import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { connection, readOnlyReport, classify, executeSuffix, verifyPackage, validateApproval, root, requireCondition } from "./core.mjs";
import { auditRuntime } from "./runtime-audit.mjs";

// Never print a driver exception: messages/details can contain URIs or row data.
function safeCode(error) { return /^[A-Z][A-Z0-9_]+$/.test(error?.message || "") ? error.message : /^[A-Z0-9]{5}$/.test(error?.code || "") ? `SQLSTATE_${error.code}` : "OPERATION_FAILED_REVIEW_PRIVATE_DIAGNOSTICS"; }
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
  if (typeof value === "string" && (/postgres(?:ql)?:\/\//i.test(value) || /\bpassword\s*=/i.test(value))) return "[DATABASE_CONNECTION_TEXT_REDACTED]";
  return value;
}
async function stdinJson() { let text = ""; for await (const chunk of process.stdin) { text += chunk; requireCondition(text.length < 2000000, "INPUT_TOO_LARGE"); } return JSON.parse(text); }
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "audit-env-stdin") {
    const input = await stdinJson();
    console.log(JSON.stringify(auditRuntime(input.preview, input.production), null, 2)); return;
  }
  requireCondition(["collect-readonly", "verify-postcommit-readonly", "execute-missing-suffix"].includes(command), "USAGE_COLLECT_READONLY_OR_VERIFY_POSTCOMMIT_READONLY_OR_EXECUTE_MISSING_SUFFIX");
  const localTest = args.includes("--local-test");
  const option = key => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : undefined; };
  const packageDigest = await verifyPackage();
  let approval;
  if (command === "execute-missing-suffix") {
    requireCondition(option("--approval"), "APPROVAL_FILE_REQUIRED");
    approval = JSON.parse(await readFile(option("--approval"), "utf8"));
    validateApproval(approval, packageDigest, localTest); // Check before connecting.
    if (!localTest) {
      requireCondition(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim() === approval.release_commit, "CHECKOUT_SHA_MISMATCH");
      requireCondition(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root }).toString().trim() === "", "TRACKED_CHECKOUT_NOT_CLEAN");
      // Package must be in the approved commit, not merely untracked local files.
      const committed = execFileSync("git", ["show", `${approval.release_commit}:scripts/authoring-release/PACKAGE_SHA256SUMS`], { cwd: root }).toString();
      requireCondition(committed === await readFile(new URL("./PACKAGE_SHA256SUMS", import.meta.url), "utf8"), "PACKAGE_NOT_IN_APPROVED_COMMIT");
    }
  } else if (!localTest) requireCondition(args.includes("--remote-readonly-approved"), "REMOTE_READ_ONLY_APPROVAL_REQUIRED");
  const client = connection(process.env.AUTHORING_RELEASE_DIRECT_URL, localTest);
  await client.connect();
  try {
    if (command === "execute-missing-suffix") console.log(JSON.stringify(await executeSuffix(client, approval, { localTest })));
    else {
      const report = await readOnlyReport(client);
      const decision = await classify(report, localTest ? report.identity.database : "neondb");
      if (command === "verify-postcommit-readonly") {
        requireCondition(option("--approval"), "POST_COMMIT_EXPECTATION_FILE_REQUIRED");
        const expected = JSON.parse(await readFile(option("--approval"), "utf8"));
        requireCondition(expected.package_sha256 === packageDigest && /^[0-9a-f]{40}$/.test(expected.release_commit || ""), "POST_COMMIT_EXPECTATION_MISMATCH");
        if (!Array.isArray(expected.expected_missing_ids) || expected.expected_missing_ids.length === 0 || expected.expected_missing_ids.some(id => report.ledger?.find(row => row.id === id)?.source_commit !== expected.release_commit)) {
          decision.status = "NO_GO"; decision.errors.push("POST_COMMIT_SOURCE_COMMIT_MISMATCH");
        }
      }
      requireCondition(option("--out"), "PRIVATE_OUTPUT_FILE_REQUIRED");
      await writeFile(option("--out"), JSON.stringify(redact({ report, decision, package_sha256: packageDigest }), null, 2) + "\n", { mode: 0o600, flag: "wx" });
      console.log(JSON.stringify(decision));
      if (decision.status === "NO_GO" || command === "verify-postcommit-readonly" && decision.status !== "ALREADY_COMPLETE") process.exitCode = 2;
    }
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(safeCode(error)); process.exitCode = 1; });
}
