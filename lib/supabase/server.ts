import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseEnv } from "./env";

/**
 * 以"当前登录用户"的身份访问数据库。
 * 所有查询都带着用户的登录凭证，数据库的 RLS 策略保证每个人只能读写自己的数据，
 * 即使代码里漏写了过滤条件，也不会看到别人的数据。
 */
export async function getSupabase() {
  // 明确标记为"请求时才执行"：Supabase 客户端初始化时会读取当前时间，不能在预渲染阶段运行
  await connection();
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 在 Server Component 里不能写 cookie。登录状态的刷新由 proxy.ts 负责，这里可以忽略
        }
      },
    },
  });
}

/** 当前登录用户；没登录返回 null。用 getClaims 校验 JWT 签名，不能只信任 cookie 内容 */
export async function getCurrentUser() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
}
