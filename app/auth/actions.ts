"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/safe-next";
import { getSupabase } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 把 Supabase 的错误码翻译成用户能看懂的提示 */
function authErrorMessage(error: AuthError, fallback: string) {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return "邮件发送太频繁，请稍后再试";
    case "over_request_rate_limit":
      return "尝试次数太多，请稍后再试";
    case "otp_expired":
      return "验证码错误或已过期，请重新获取";
    case "weak_password":
      return "密码强度不够，请换一个更复杂的密码";
    case "user_already_exists":
    case "email_exists":
      return "这个邮箱已经注册过了，请直接登录";
    case "signup_disabled":
      return "当前不开放注册";
    case "email_address_invalid":
      return "这个邮箱地址无法使用，请换一个";
    default:
      return fallback;
  }
}

function verifyUrl(email: string, next: string) {
  return `/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`;
}

// ---------------------------------------------------------------------------
// 登录
// ---------------------------------------------------------------------------

export type SignInState = { error: string | null; email: string; unverified: boolean };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "请输入邮箱和密码", email, unverified: false };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 注册了但还没验证邮箱：提示去输入验证码
    if (error.code === "email_not_confirmed") {
      return { error: "这个邮箱还没有完成验证", email, unverified: true };
    }
    // 其他情况不区分"邮箱不存在"和"密码错误"，避免泄露哪些邮箱注册过
    return { error: authErrorMessage(error, "邮箱或密码不正确"), email, unverified: false };
  }

  redirect(safeNext(formData.get("next")));
}

// ---------------------------------------------------------------------------
// 注册：成功后发送 6 位验证码到邮箱，跳转到验证页
// ---------------------------------------------------------------------------

export type SignUpState = { error: string | null; email: string };

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(formData.get("next"));
  const fail = (error: string): SignUpState => ({ error, email });

  if (!EMAIL_RE.test(email)) return fail("邮箱格式不正确");
  if (password.length < 8) return fail("密码至少 8 位");
  if (password !== confirm) return fail("两次输入的密码不一致");

  // 如果邮件模板用的是确认链接而不是验证码，链接会回到本站的 /auth/callback
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) return fail(authErrorMessage(error, `注册失败：${error.message}`));

  // 邮箱已被验证过的账号占用时，Supabase 为防止探测邮箱，会返回一个没有身份信息的"假用户"
  if (data.user && data.user.identities?.length === 0) {
    return fail("这个邮箱已经注册过了，请直接登录");
  }

  // 没开启邮箱验证时会直接返回登录状态
  if (data.session) redirect(next);

  redirect(verifyUrl(email, next));
}

// ---------------------------------------------------------------------------
// 验证邮箱：输入邮件里的 6 位验证码
// ---------------------------------------------------------------------------

export type VerifyState = { error: string | null };

export async function verifyEmail(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");

  if (!EMAIL_RE.test(email)) return { error: "邮箱地址无效，请重新注册" };
  if (!/^\d{6}$/.test(token)) return { error: "请输入 6 位数字验证码" };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: authErrorMessage(error, "验证码错误或已过期，请重新获取") };

  redirect(safeNext(formData.get("next")));
}

export type ResendResult = { ok: true } | { ok: false; error: string };

export async function resendVerification(email: string): Promise<ResendResult> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return { ok: false, error: "邮箱地址无效" };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await getSupabase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalized,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { ok: false, error: authErrorMessage(error, `发送失败：${error.message}`) };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 退出
// ---------------------------------------------------------------------------

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
