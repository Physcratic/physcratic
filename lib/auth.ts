import { betterAuth } from "better-auth";
import { after } from "next/server";
import { pool } from "@/lib/db";
import { communityProfilesEnabled } from "@/lib/community/profile-route";
import { createAuthOptions } from "@/lib/auth-config";

export const auth = betterAuth(createAuthOptions({ pool, profileSignupEnabled: communityProfilesEnabled(), defer: (task) => after(task) }));
