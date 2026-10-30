import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "注册 · Meeting Tasks" };

export default function SignupPage() {
  return (
    <AuthCard title="注册账号">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
