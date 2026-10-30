import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * AI 提取的额度配置（都可以用环境变量调整）：
 * - AI_FREE_LIMIT：每个账号可以使用几次，默认 1 次
 * - AI_QUOTA_WINDOW_HOURS：在多少小时内计数；不填表示"终身"，也就是每人免费 N 次
 * - AI_ADMIN_EMAILS：不受限制的账号（逗号分隔），比如你自己用来演示的账号
 */
export function quotaConfig() {
  const limit = Number(process.env.AI_FREE_LIMIT);
  const hours = Number(process.env.AI_QUOTA_WINDOW_HOURS);
  return {
    limit: Number.isInteger(limit) && limit > 0 ? limit : 1,
    windowHours: Number.isInteger(hours) && hours > 0 ? hours : null,
  };
}

export function isUnlimited(email: string | null) {
  if (!email) return false;
  const admins = (process.env.AI_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export type QuotaInfo = {
  limit: number;
  remaining: number;
  windowHours: number | null;
  unlimited: boolean;
};

/** 当前用户还剩几次 */
export async function remainingQuota(db: SupabaseClient, email: string | null): Promise<QuotaInfo> {
  const { limit, windowHours } = quotaConfig();
  if (isUnlimited(email)) return { limit, remaining: limit, windowHours, unlimited: true };

  let query = db.from("ai_usage").select("id", { count: "exact", head: true });
  if (windowHours) {
    query = query.gte("created_at", new Date(Date.now() - windowHours * 3600 * 1000).toISOString());
  }
  const { count } = await query;
  return { limit, remaining: Math.max(0, limit - (count ?? 0)), windowHours, unlimited: false };
}

/**
 * 占用一次额度。检查和记录在数据库函数里一次完成（带锁），并发点击也不会超额。
 * 返回剩余次数；不受限账号返回 Infinity；额度用完返回 null。
 */
export async function claimQuota(db: SupabaseClient, email: string | null) {
  if (isUnlimited(email)) return Number.POSITIVE_INFINITY;

  const { limit, windowHours } = quotaConfig();
  const { data, error } = await db.rpc("claim_ai_extraction", {
    p_limit: limit,
    p_window_hours: windowHours,
  });
  if (error) throw new Error(error.message);
  return data === -1 ? null : (data as number);
}
