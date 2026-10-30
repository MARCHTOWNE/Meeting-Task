"use server";

import { openai } from "@ai-sdk/openai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { extractTasks } from "@/lib/agent/extract-tasks";
import { claimQuota, quotaConfig } from "@/lib/agent/quota";
import { supabaseDataSource } from "@/lib/agent/supabase-source";
import type { ExtractionResult } from "@/lib/agent/types";
import { getCurrentUser, getSupabase } from "@/lib/supabase/server";

/** 默认用最便宜的模型；可以在 .env.local 里用 OPENAI_MODEL 换成别的 */
const DEFAULT_MODEL = "gpt-5-nano";

export type ExtractResponse =
  | { ok: true; result: ExtractionResult; remaining: number }
  | { ok: false; error: string; remaining?: number };

export async function extractTaskProposals(meetingId: string): Promise<ExtractResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "没有配置 OPENAI_API_KEY，请在 .env.local 中添加" };
  }

  const supabase = await getSupabase();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("title, meeting_date, transcript")
    .eq("id", meetingId)
    .maybeSingle();

  if (error || !meeting) return { ok: false, error: "找不到这场会议" };

  // 先占用一次额度再调用模型：失败的调用也算一次，防止有人反复点击刷费用
  const user = await getCurrentUser();
  let remaining: number | null;
  try {
    remaining = await claimQuota(supabase, user?.email ?? null);
  } catch (e) {
    console.error("[claimQuota]", e);
    return { ok: false, error: "无法检查使用额度，请确认已运行 supabase/migrations 里的 SQL" };
  }
  if (remaining === null) {
    const { limit, windowHours } = quotaConfig();
    return {
      ok: false,
      error: windowHours
        ? `AI 提取次数已用完（每 ${windowHours} 小时 ${limit} 次），请稍后再试`
        : `免费体验次数已用完（每个账号 ${limit} 次）`,
      remaining: 0,
    };
  }

  const modelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  try {
    const result = await extractTasks({
      model: openai(modelName),
      modelName,
      dataSource: supabaseDataSource(supabase),
      meeting,
      // 推理强度调低：速度更快、费用更低，对这类提取任务足够
      providerOptions: { openai: { reasoningEffort: "low" } },
    });
    return { ok: true, result, remaining };
  } catch (e) {
    console.error("[extractTaskProposals]", e);
    return { ok: false, error: friendlyAiError(e), remaining };
  }
}

function friendlyAiError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (/quota|billing|insufficient/i.test(message)) return "OpenAI 账户余额不足，请到 platform.openai.com 充值";
  if (/api key|401|unauthorized/i.test(message)) return "OpenAI API key 无效，请检查 .env.local";
  if (/model.*(not found|does not exist)|404/i.test(message)) return "模型不可用，请检查 OPENAI_MODEL 配置";
  if (/rate limit|429/i.test(message)) return "请求太频繁，请稍后再试";
  return `AI 提取失败：${message}`;
}

// ---------------------------------------------------------------------------
// 确认写入：把用户勾选（并可能修改过）的提议写进数据库
// ---------------------------------------------------------------------------

const priority = z.enum(["low", "medium", "high"]);
const status = z.enum(["todo", "in_progress", "done"]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");

const createSchema = z.object({
  title: z.string().trim().min(1, "任务标题不能为空").max(100),
  description: z.string().trim().max(1000).nullable(),
  assignee_id: z.uuid().nullable(),
  due_date: date.nullable(),
  priority,
  source_quote: z.string().max(1000),
});

const updateSchema = z
  .object({
    task_id: z.uuid(),
    status: status.optional(),
    priority: priority.optional(),
    due_date: date.optional(),
    assignee_id: z.uuid().optional(),
  })
  .refine((u) => Object.keys(u).length > 1, "更新提议至少要修改一个字段");

const applySchema = z
  .object({
    meetingId: z.uuid(),
    summary: z.string().trim().max(300).nullable(),
    creates: z.array(createSchema).max(20),
    updates: z.array(updateSchema).max(20),
  })
  .refine((p) => p.creates.length + p.updates.length > 0, "请至少选择一条提议");

export type ApplyInput = z.input<typeof applySchema>;
export type ApplyResponse =
  | { ok: true; created: number; updated: number }
  | { ok: false; error: string };

export async function applyProposals(input: ApplyInput): Promise<ApplyResponse> {
  // 客户端传来的数据不可信：先用 zod 校验结构，外键和约束再由数据库兜底
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "提交的数据格式不正确" };
  }
  const { meetingId, summary, creates, updates } = parsed.data;

  // 调用数据库函数，所有新建和更新在同一个事务里完成：要么全部成功，要么全部不写入
  const { data, error } = await (await getSupabase()).rpc("apply_task_proposals", {
    p_meeting_id: meetingId,
    p_summary: summary,
    p_creates: creates,
    p_updates: updates,
  });

  if (error) {
    console.error("[applyProposals]", error);
    if (error.code === "PGRST202") {
      return {
        ok: false,
        error: "数据库缺少 apply_task_proposals 函数，请在 Supabase SQL Editor 运行 supabase/migrations 里的 SQL",
      };
    }
    return { ok: false, error: `写入失败，没有任何数据被修改：${error.message}` };
  }

  revalidatePath("/tasks");
  revalidatePath("/members");
  revalidatePath("/meetings", "layout");

  const counts = data as { created: number; updated: number };
  return { ok: true, created: counts.created, updated: counts.updated };
}
