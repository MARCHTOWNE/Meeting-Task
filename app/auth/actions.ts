"use server";

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

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
