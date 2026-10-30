import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "登录 · Meeting Tasks" };

export default function LoginPage() {
  return (
    <AuthCard title="登录 Meeting Tasks">
      {/* 表单读取网址里的 ?next= 参数，需要放在 Suspense 里 */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
