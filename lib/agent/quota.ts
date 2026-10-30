import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 每个账号 24 小时内最多可以运行几次 AI 提取，可以用环境变量 AI_DAILY_LIMIT 调整 */
export function dailyLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 10;
}

/** 当前用户今天（最近 24 小时）还剩几次 */
export async function remainingQuota(db: SupabaseClient) {
  const limit = dailyLimit();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  return { limit, remaining: Math.max(0, limit - (count ?? 0)) };
}

/**
 * 占用一次额度。检查和记录在数据库函数里一次完成（带锁），并发点击也不会超额。
 * 返回剩余次数；额度用完返回 null。
 */
export async function claimQuota(db: SupabaseClient) {
  const { data, error } = await db.rpc("claim_ai_extraction", { p_daily_limit: dailyLimit() });
  if (error) throw new Error(error.message);
  return data === -1 ? null : (data as number);
}
