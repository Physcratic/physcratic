import test from "node:test";
import assert from "node:assert/strict";
import { validateStagingEnvironment } from "./staging-preflight";
const env={ VERCEL_ENV:"preview",DEPLOYMENT_STAGE:"staging",DATABASE_URL:"postgresql://stage:mock@stage.example/stage",EXPECTED_STAGING_DB_HOST:"stage.example",EXPECTED_STAGING_DB_NAME:"stage",EXPECTED_STAGING_DB_ROLE:"stage",BETTER_AUTH_URL:"https://staging.physcratic.com",BETTER_AUTH_SECRET:"x".repeat(32),NEXT_PUBLIC_RECAPTCHA_SITE_KEY:"public",RECAPTCHA_SECRET_KEY:"mock",RECAPTCHA_ALLOWED_HOSTNAMES:"staging.physcratic.com",RESEND_API_KEY:"mock",RESEND_EMAIL_DOMAIN:"example.com",STAGING_VERIFICATION_EMAIL_ALLOWLIST:"test@example.com" };
test("explicit staging identity and origin required; placeholders and ambiguous config rejected",()=>{
 assert.equal(validateStagingEnvironment(env).database,"stage");
 for(const patch of [{DATABASE_URL:""},{DATABASE_URL:"[SENSITIVE]"},{DATABASE_URL:env.DATABASE_URL.replace("mock","%5BSENSITIVE%5D")},{VERCEL_ENV:"production"},{EXPECTED_STAGING_DB_HOST:"other.example"},{EXPECTED_STAGING_DB_NAME:"other"},{EXPECTED_STAGING_DB_ROLE:"other"},{BETTER_AUTH_URL:"https://physcratic.com"},{RECAPTCHA_ALLOWED_HOSTNAMES:"physcratic.com"},{DATABASE_URL:env.DATABASE_URL+"?host=other.example"},{DATABASE_URL:env.DATABASE_URL+"?user=other"},{DATABASE_URL:env.DATABASE_URL+"?options=other"}]) assert.throws(()=>validateStagingEnvironment({...env,...patch}));
});
