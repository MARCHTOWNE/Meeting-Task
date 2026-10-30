"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Loader2, MailCheck, UserPlus } from "lucide-react";
import { type SignUpState, signUp } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignUpState = { error: null, email: "", checkEmail: false };

export function SignupForm() {
  const next = useSearchParams().get("next") ?? "/tasks";
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.checkEmail) {
    return (
      <div className="grid gap-3 text-center">
        <MailCheck className="mx-auto size-10 text-emerald-600" />
        <p className="font-medium">请查收确认邮件</p>
        <p className="text-sm text-muted-foreground">
          我们给 <span className="font-medium text-foreground">{state.email}</span>{" "}
          发送了一封确认邮件，点击邮件里的链接即可完成注册并登录。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-2">
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">至少 8 位</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm">确认密码</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        注册
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          登录
        </Link>
      </p>
    </form>
  );
}
