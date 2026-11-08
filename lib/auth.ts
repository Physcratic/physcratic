import { betterAuth } from "better-auth";
import { after } from "next/server";
import { pool } from "@/lib/db";
import { createAuthOptions } from "@/lib/auth-config";

export const auth = betterAuth(createAuthOptions({ pool, defer: (task) => after(task) }));
