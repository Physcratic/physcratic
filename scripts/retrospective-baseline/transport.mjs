import { spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sslMode = "verify-full";
const tlsLine = /^SSL connection \(protocol: (TLSv1\.[23]), cipher: [A-Za-z0-9_-]+, compression: (?:on|off)(?:, ALPN: [A-Za-z0-9_.-]+)?\)$/;

export function captureTransport(capture) {
  const tls = capture.clientTls;
  const protocol = tls?.sslMode === sslMode && typeof tls.conninfo === "string"
    ? tlsLine.exec(tls.conninfo)?.[1] : undefined;
  const backend = capture.target?.backendTls;
  if (!protocol || typeof backend?.ssl !== "boolean"
    || (backend.ssl ? !/^TLSv1(?:\.[0-9]+)?$/.test(backend.protocol) : backend.protocol !== null)) {
    return null;
  }
  return { client: { sslMode, protocol }, backend };
}

export function attestPsqlOutput(stdout) {
  const lines = stdout.trim().split(/\r?\n/);
  const observations = lines.slice(0, -1).filter(line => line.startsWith("SSL connection"));
  if (observations.length !== 1 || !tlsLine.test(observations[0])) {
    throw Error("Missing or unsupported client TLS observation from psql conninfo");
  }
  // Retain only the TLS line from conninfo. The rest is connection metadata.
  const snapshot = JSON.parse(lines.at(-1));
  if (snapshot.captureVersion !== 2) throw Error("Unexpected SQL capture format");
  const capture = { ...snapshot, clientTls: { sslMode, conninfo: observations[0] } };
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
