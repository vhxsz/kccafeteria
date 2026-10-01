import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create a school workspace" };

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}
