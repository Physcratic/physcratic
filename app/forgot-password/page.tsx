import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/account-pages";
import { authEmailReady } from "@/lib/auth-email-transport";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function ForgotPassword() {
  return <ForgotPasswordForm emailReady={authEmailReady()} />;
}
