"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/safe-next";
import { getSupabase } from "@/lib/supabase/server";

export type SignInState = { error: string | null; email: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "请输入邮箱和密码", email };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 不区分"邮箱不存在"和"密码错误"，避免泄露哪些邮箱注册过
    const message = /rate|too many/i.test(error.message) ? "尝试次数太多，请稍后再试" : "邮箱或密码不正确";
    return { error: message, email };
  }

  redirect(safeNext(formData.get("next")));
}

export type SignUpState = { error: string | null; email: string; checkEmail: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fail = (error: string): SignUpState => ({ error, email, checkEmail: false });

  if (!EMAIL_RE.test(email)) return fail("邮箱格式不正确");
  if (password.length < 8) return fail("密码至少 8 位");
  if (password !== confirm) return fail("两次输入的密码不一致");

  // 邮件里的确认链接要回到本站的 /auth/callback
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) return fail("这个邮箱已经注册过了，请直接登录");
    if (/rate|too many/i.test(error.message)) return fail("注册太频繁，请稍后再试");
    if (/password/i.test(error.message)) return fail("密码强度不够，请换一个更复杂的密码");
    if (/signups not allowed|disabled/i.test(error.message)) return fail("当前不开放注册");
    return fail(`注册失败：${error.message}`);
  }

  // Supabase 开启了"邮箱确认"时不会立即返回登录状态，需要用户先点邮件里的链接
  if (!data.session) return { error: null, email, checkEmail: true };

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
