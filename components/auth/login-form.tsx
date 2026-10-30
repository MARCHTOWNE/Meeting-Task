"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Loader2, LogIn } from "lucide-react";
import { type SignInState, signIn } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignInState = { error: null, email: "" };

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/tasks";
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

      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        登录
      </Button>

      <p className="text-center text-xs text-muted-foreground">账号由管理员在 Supabase 中创建，暂不开放注册。</p>
    </form>
  );
}
