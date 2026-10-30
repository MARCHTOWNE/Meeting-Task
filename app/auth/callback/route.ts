import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/safe-next";
import { getSupabase } from "@/lib/supabase/server";

/** 用户点击注册确认邮件里的链接后回到这里：用一次性 code 换取登录状态 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=confirm", origin));
}
