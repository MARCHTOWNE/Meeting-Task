import { Suspense } from "react";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "登录 · Meeting Tasks" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <CardTitle className="text-xl">登录 Meeting Tasks</CardTitle>
          <CardDescription>把会议记录自动变成可执行的任务</CardDescription>
        </CardHeader>
        <CardContent>
          {/* LoginForm 读取网址里的 ?next= 参数，需要放在 Suspense 里 */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
