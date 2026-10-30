"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { type VerifyState, resendVerification, verifyEmail } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: VerifyState = { error: null };
/** Supabase 限制同一邮箱 60 秒内只能发一次 */
const RESEND_COOLDOWN = 60;

export function VerifyForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const next = params.get("next") ?? "/tasks";
  const [state, formAction, pending] = useActionState(verifyEmail, initialState);
  const [resending, startResend] = useTransition();
  // 刚注册时邮件已经发出，所以一进页面就开始倒计时
  const [cooldown, setCooldown] = useState(params.get("resend") ? 0 : RESEND_COOLDOWN);
  const autoResent = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function resend() {
    startResend(async () => {
      const result = await resendVerification(email);
      if (result.ok) {
        toast.success("验证码已重新发送，请查收邮件");
        setCooldown(RESEND_COOLDOWN);
      } else {
        toast.error(result.error);
      }
    });
  }

  // 从登录页"去验证"过来时（?resend=1），自动重新发送一次验证码
  useEffect(() => {
    if (params.get("resend") && email && !autoResent.current) {
      autoResent.current = true;
      resend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!email) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        链接不完整，请{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          重新注册
        </Link>
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col items-center gap-2 text-center">
        <MailCheck className="size-9 text-emerald-600" />
        <p className="text-sm text-muted-foreground">
          验证码已发送到 <span className="font-medium text-foreground">{email}</span>
          <br />
          请输入邮件中的 6 位数字。没收到的话，请检查垃圾邮件文件夹。
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="token">验证码</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          className="text-center font-mono text-lg tracking-[0.5em]"
          required
          autoFocus
        />
      </div>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
        验证并登录
      </Button>

      <Button type="button" variant="ghost" size="sm" disabled={resending || cooldown > 0} onClick={resend}>
        {resending && <Loader2 className="animate-spin" />}
        {cooldown > 0 ? `重新发送（${cooldown} 秒后可用）` : "重新发送验证码"}
      </Button>
    </form>
  );
}
