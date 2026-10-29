import { generateText, isStepCount, type LanguageModel } from "ai";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
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
  const { tools, proposals, steps } = createAgentTools(dataSource);

  const result = await generateText({
    model,
    system: buildSystemPrompt(meeting.meeting_date),
    prompt: buildUserPrompt(meeting.title, meeting.transcript),
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: 4000,
    providerOptions,
  });

  return {
    summary: result.text.trim(),
    proposals,
    steps,
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    },
    model: modelName,
  };
}
