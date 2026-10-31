import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { Pool } from "pg";
import { validateStagingEnvironment } from "../lib/staging-preflight";
import { deliverVerificationEmail } from "../lib/verification-email-delivery";

async function main() {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) throw new Error("Usage: pnpm exec tsx scripts/staging-preflight.ts PATH_TO_SELECTED_ENV_FILE");
  const env = parseEnv(await readFile(file,"utf8")); // No process.env fallback or PGHOST discovery.
  const config = validateStagingEnvironment(env);
  // Validate sender/allow-list/origin without ever making a provider request.
  const firstRecipient = env.STAGING_VERIFICATION_EMAIL_ALLOWLIST!.split(",")[0].trim();
  await deliverVerificationEmail({ email:firstRecipient,url:`${env.BETTER_AUTH_URL}/api/auth/verify-email`,token:"preflight-not-a-real-token" },env,async()=>({error:null}));
  const pool = new Pool({connectionString:config.connectionString,max:1,connectionTimeoutMillis:5000,statement_timeout:5000, options:"-c default_transaction_read_only=on"});
  try {
    const client=await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const identity=await client.query("SELECT current_database() AS db, current_user AS role, current_setting('transaction_read_only') AS ro");
      if(identity.rows[0].db!==config.database || identity.rows[0].role!==config.role || identity.rows[0].ro!=="on") throw new Error("Actual database identity mismatch");
      const columns=await client.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1)",[["user","account","session","verification","rateLimit"]]);
      const required: Record<string, string[]>={user:["id","email","emailVerified","termsAcceptedVersion","termsAcceptedAt"],account:["id","userId","password"],session:["id","token","userId","expiresAt"],verification:["id","identifier","value","expiresAt"],rateLimit:["id","key","count","lastRequest"]};
      for(const [table,fields] of Object.entries(required)) for(const field of fields) if(!columns.rows.some(r=>r.table_name===table&&r.column_name===field)) throw new Error("Expected auth schema missing");
      if(!columns.rows.some(r=>r.table_name==="rateLimit"&&r.column_name==="lastRequest"&&r.data_type==="bigint")) throw new Error("Limiter timestamp type mismatch");
      for (const [name,type] of [["id","text"],["key","text"],["count","integer"],["lastRequest","bigint"]]) if(!columns.rows.some(r=>r.table_name==="rateLimit"&&r.column_name===name&&r.data_type===type&&r.is_nullable==="NO")) throw new Error("Limiter column contract mismatch");
      const indexes=await client.query(`SELECT i.indisprimary AS primary, i.indisunique AS unique, a.attname AS column
        FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=i.indkey[0]
        WHERE n.nspname=current_schema() AND t.relname='rateLimit' AND i.indnkeyatts=1 AND i.indnatts=1
        AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indisvalid AND i.indisready`);
      if(!indexes.rows.some(r=>r.primary&&r.column==="id") || !indexes.rows.some(r=>r.unique&&r.column==="key")) throw new Error("Limiter primary/unique index contract mismatch");
      await client.query("ROLLBACK");
      console.log("PASS selected staging config, actual DB name/role, required schema and limiter key. Read-only queries only.");
      console.log("NOT PROVEN: Neon branch ownership, separation/copy provenance, Vercel effective scopes, TLS/provider readiness or permission to deploy.");
    } finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(()=>{ console.error("FAIL staging preflight. Check selected environment, independent identity attestation, schema and read-only access. No values or provider errors printed."); process.exitCode=1; });
