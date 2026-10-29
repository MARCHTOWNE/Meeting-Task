"use server";

import { openai } from "@ai-sdk/openai";
import { extractTasks } from "@/lib/agent/extract-tasks";
import { supabaseDataSource } from "@/lib/agent/supabase-source";
import type { ExtractionResult } from "@/lib/agent/types";
import { getSupabase } from "@/lib/supabase";

/** 默认用最便宜的模型；可以在 .env.local 里用 OPENAI_MODEL 换成别的 */
const DEFAULT_MODEL = "gpt-5-nano";

export type ExtractResponse =
  | { ok: true; result: ExtractionResult }
  | { ok: false; error: string };

export async function extractTaskProposals(meetingId: string): Promise<ExtractResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "没有配置 OPENAI_API_KEY，请在 .env.local 中添加" };
  }

  const { data: meeting, error } = await getSupabase()
    .from("meetings")
    .select("title, meeting_date, transcript")
    .eq("id", meetingId)
    .maybeSingle();

  if (error || !meeting) return { ok: false, error: "找不到这场会议" };

  const modelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  try {
    const result = await extractTasks({
      model: openai(modelName),
      modelName,
      dataSource: supabaseDataSource(),
      meeting,
      // 推理强度调低：速度更快、费用更低，对这类提取任务足够
      providerOptions: { openai: { reasoningEffort: "low" } },
    });
    return { ok: true, result };
  } catch (e) {
    console.error("[extractTaskProposals]", e);
    return { ok: false, error: friendlyAiError(e) };
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
