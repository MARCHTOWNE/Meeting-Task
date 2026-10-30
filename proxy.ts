import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * 每个请求进来时：
 * 1. 刷新 Supabase 登录状态（access token 过期时自动续期，并写回 cookie）
 * 2. 没登录的人访问任何页面都跳到 /login；已登录的人访问 /login 跳到任务页
 *
 * 这里只做"快速判断"。真正的权限控制在数据库的 RLS 里，所以即使绕过这一步也读不到数据。
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!signedIn && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  if (signedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }
  return response;
}

export const config = {
  // 静态资源和图片不需要检查登录
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
