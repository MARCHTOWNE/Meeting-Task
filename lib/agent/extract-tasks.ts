import { generateText, isStepCount, type LanguageModel } from "ai";
import { MAX_SUMMARY_LENGTH, buildSystemPrompt, buildUserPrompt } from "./prompt";
import { createAgentTools } from "./tools";
import type { AgentDataSource, ExtractionResult } from "./types";

/** 最多 12 轮"模型思考 → 调用工具"，防止 Agent 陷入死循环、产生过多费用 */
const MAX_STEPS = 12;

export async function extractTasks({
  model,
  modelName,
  dataSource,
  meeting,
  providerOptions,
}: {
  model: LanguageModel;
  modelName: string;
  dataSource: AgentDataSource;
  meeting: { title: string; meeting_date: string; transcript: string };
  providerOptions?: Parameters<typeof generateText>[0]["providerOptions"];
}): Promise<ExtractionResult> {
  const { tools, proposals, steps, getSummary } = createAgentTools(dataSource, { meetingDate: meeting.meeting_date });

  const result = await generateText({
    model,
    system: buildSystemPrompt(meeting.meeting_date),
    prompt: buildUserPrompt(meeting.title, meeting.transcript),
    tools,
    // 两个停止条件：finish 成功提交了摘要，或者达到步数上限
    stopWhen: [isStepCount(MAX_STEPS), () => getSummary() !== null],
    maxOutputTokens: 4000,
    providerOptions,
  });

  return {
    // 正常情况用 finish 提交的摘要；如果模型没调用 finish，退而用最后输出的文字并截断
    summary: getSummary() ?? truncate(result.text.trim(), MAX_SUMMARY_LENGTH),
    proposals,
    steps,
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    },
    model: modelName,
  };
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
