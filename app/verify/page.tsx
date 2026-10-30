import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyForm } from "@/components/auth/verify-form";

export const metadata: Metadata = { title: "验证邮箱 · Meeting Tasks" };

export default function VerifyPage() {
  return (
    <AuthCard title="验证邮箱">
      <Suspense>
        <VerifyForm />
      </Suspense>
    </AuthCard>
  );
}
