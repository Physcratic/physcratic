import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/account-pages";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };
export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}
