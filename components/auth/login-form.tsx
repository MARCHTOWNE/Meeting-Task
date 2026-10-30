"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Loader2, LogIn } from "lucide-react";
import { type SignInState, signIn } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignInState = { error: null, email: "", unverified: false };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/tasks";
  const confirmFailed = params.get("error") === "confirm";
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {confirmFailed && !state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          确认链接无效或已过期，请重新登录或注册
        </p>
      )}

      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {state.error}
          {state.unverified && (
            <Link
              href={`/verify?email=${encodeURIComponent(state.email)}&next=${encodeURIComponent(next)}&resend=1`}
              className="font-medium underline underline-offset-4"
            >
              去验证
            </Link>
          )}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        登录
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        还没有账号？{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          注册
        </Link>
      </p>
    </form>
  );
}
