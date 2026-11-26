import { spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sslMode = "verify-full";
const tlsLine = /^SSL connection \(protocol: (TLSv1\.[23]), cipher: [A-Za-z0-9_-]+, compression: (?:on|off)(?:, ALPN: [A-Za-z0-9_.-]+)?\)$/;
const tlsConnectionRow = /^\s*SSL Connection\s*\|\s*true\s*$/;
const tlsProtocolRow = /^\s*SSL Protocol\s*\|\s*(TLSv1\.[23])\s*$/;

function conninfoProtocol(conninfo) {
  const lines = conninfo.split(/\r?\n/);
  if (lines.length === 1) return tlsLine.exec(lines[0])?.[1];
  // PostgreSQL 18 prints two separate rows even with -qAt. Require each
  // exactly once so disabled, duplicated or mixed evidence fails closed.
  if (lines.length !== 2 || !lines.some(line => tlsConnectionRow.test(line))) return undefined;
  return lines.map(line => tlsProtocolRow.exec(line)).find(Boolean)?.[1];
}

export function captureTransport(capture) {
  const tls = capture.clientTls;
  const protocol = tls?.sslMode === sslMode && typeof tls.conninfo === "string"
    ? conninfoProtocol(tls.conninfo) : undefined;
  const backend = capture.target?.backendTls;
  if (!protocol || typeof backend?.ssl !== "boolean"
    || (backend.ssl ? !/^TLSv1(?:\.[0-9]+)?$/.test(backend.protocol) : backend.protocol !== null)) {
    return null;
  }
  return { client: { sslMode, protocol }, backend };
}

export function attestPsqlOutput(stdout) {
  const lines = stdout.trim().split(/\r?\n/);
  const conninfo = lines.slice(0, -1).filter(line => /^\s*SSL (?:connection|Connection|Protocol)\b/.test(line)).join("\n");
  if (!conninfoProtocol(conninfo)) {
    throw Error("Missing or unsupported client TLS observation from psql conninfo");
  }
  // Retain only the observed TLS sentence or table rows, leaving out other connection metadata.
  const snapshot = JSON.parse(lines.at(-1));
  if (snapshot.captureVersion !== 2) throw Error("Unexpected SQL capture format");
  const capture = { ...snapshot, clientTls: { sslMode, conninfo } };
  if (!captureTransport(capture)) throw Error("Incomplete client or backend transport observation");
  return capture;
}

export function runPsqlCapture(plan, outputPath) {
  if (existsSync(outputPath) || !statSync(dirname(outputPath)).isDirectory()) {
    throw Error("Use a fresh capture filename in an existing restricted evidence directory");
  }
  const { target } = plan;
  const environment = { ...process.env, LC_ALL: "C", LANG: "C", LANGUAGE: "C", PGCLIENTENCODING: "UTF8" };
  for (const key of ["PGSERVICE", "PGSERVICEFILE", "PGHOSTADDR", "PGOPTIONS", "PGSSLNEGOTIATION"]) delete environment[key];
  // The validated database name is unquoted in this generated libpq conninfo.
  // Explicit TLS parameters take precedence over inherited libpq environment values.
  const connection = "dbname=" + target.database + " sslmode=" + sslMode + " gssencmode=disable connect_timeout=5";
  const result = spawnSync("psql", [
    "-X", "-qAt", "--set=ON_ERROR_STOP=1",
    "--host", target.endpoint, "--port", String(target.port), "--username", target.login, "--dbname", connection,
    "--set", "expected_database=" + target.database, "--set", "expected_login=" + target.login,
    "--set", "expected_version=" + target.version, "--set", "runtime_role=" + plan.runtimeRole,
    // psql processes both actions in order on one connection. capture.sql has no reconnect.
    "--command", "\\conninfo", "--file", fileURLToPath(new URL("capture.sql", import.meta.url)),
  ], {
    env: environment, stdio: ["inherit", "pipe", "inherit"], encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw Error("Could not run psql: " + result.error.message);
  if (result.status !== 0) throw Error("psql did not complete the read-only capture");
  const capture = attestPsqlOutput(result.stdout);
  writeFileSync(outputPath, JSON.stringify(capture) + "\n", { flag: "wx", mode: 0o600 });
}
