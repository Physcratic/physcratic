import { randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";

const privateUploadTokenSetting = "physcratic.private_upload_token";
const acknowledgementSignature = "account_deletion_upload_finished(text,text,text)";

export async function preparePrivateUpload(
  execute: (statement: string, values: string[]) => Promise<{ rows: { authorized: boolean | null }[] }>,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const { rows } = await execute(
    "SELECT set_config($1,$2,true), has_function_privilege(to_regprocedure($3),'EXECUTE') AS authorized",
    [privateUploadTokenSetting, token, acknowledgementSignature],
  );
  if (rows[0]?.authorized === false || (rows[0]?.authorized == null && process.env.ACCOUNT_DELETION_ENABLED === "true"))
    throw new Error("Private upload acknowledgement is unavailable.");
  // The Blob SDK retries ambiguous network failures by default. Only a
  // single provider attempt can be closed by its own success response.
  if (rows[0]?.authorized === true && process.env.VERCEL_BLOB_RETRIES !== "0")
    throw new Error("Private upload acknowledgement requires single-attempt storage writes.");
  return token;
}

export function preparePrivateUploadReservation(client: PoolClient) {
  return preparePrivateUpload((statement, values) => client.query(statement, values));
}

export async function acknowledgePrivateUpload(
  pool: Pick<Pool, "query">, provider: "author" | "profile" | "medal", pathname: string, token: string,
): Promise<void> {
  try {
    await pool.query("SELECT account_deletion_upload_finished($1,$2,$3)", [provider, pathname, token]);
  } catch (error) {
    // Older schemas continue to accept ordinary uploads while deletion is off.
    if ((error as { code?: string }).code !== "42883" || process.env.ACCOUNT_DELETION_ENABLED === "true") throw error;
  }
}
