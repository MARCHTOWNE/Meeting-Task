import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { extractTasks } from "./extract-tasks";
import type { AgentDataSource } from "./types";

const dataSource: AgentDataSource = {
  listMembers: async () => [
    { id: "m-alice", name: "Alice", email: null },
    { id: "m-bob", name: "Bob", email: null },
  ],
  listTasks: async () => [
    {
      id: "t-login",
      title: "修复登录页面样式问题",
      status: "in_progress",
      priority: "low",
      due_date: null,
      assignee_id: "m-bob",
    },
  ],
};

const meeting = {
  title: "产品周会",
  meeting_date: "2026-10-27",
  transcript: "Bob：登录页面的问题我已经修好了。\nAlice：我周五前把访谈结论整理成文档。",
};

const usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 50, text: 50, reasoning: undefined },
};

type Call = { name: string; input: object };

/** 构造一个按顺序"回放"预设回复的假模型：每一轮返回若干工具调用，最后一轮返回总结文字 */
function scriptedModel(turns: (Call[] | string)[]) {
  let turn = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const current = turns[Math.min(turn++, turns.length - 1)];
      if (typeof current === "string") {
        return {
          content: [{ type: "text", text: current }],
          finishReason: { unified: "stop", raw: undefined },
          usage,
          warnings: [],
        };
      }
      return {
        content: current.map((c, i) => ({
          type: "tool-call" as const,
          toolCallId: `call-${turn}-${i}`,
          toolName: c.name,
          input: JSON.stringify(c.input),
        })),
        finishReason: { unified: "tool-calls", raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

const createInput = {
  title: "整理访谈结论文档",
  description: null,
  assignee_id: "m-alice",
  due_date: "2026-10-30",
  priority: "medium",
  source_quote: "Alice：我周五前把访谈结论整理成文档。",
};

const updateInput = {
  task_id: "t-login",
  status: "done",
  due_date: null,
  assignee_id: null,
  priority: null,
  reason: "Bob 说已经修好了",
  source_quote: "Bob：登录页面的问题我已经修好了。",
};

describe("extractTasks agent", () => {
  it("proposes a new task and an update to an existing task", async () => {
    const model = scriptedModel([
      [
        { name: "list_members", input: {} },
        { name: "search_tasks", input: { query: "" } },
      ],
      [
        { name: "propose_create_task", input: createInput },
        { name: "propose_update_task", input: updateInput },
      ],
      "本次周会确认了登录问题已修复，Alice 将整理访谈结论。",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });

    expect(result.summary).toContain("访谈");
    expect(result.proposals).toHaveLength(2);

    // 同一轮的多个工具调用是并行执行的，所以不依赖顺序
    const create = result.proposals.find((p) => p.kind === "create");
    const update = result.proposals.find((p) => p.kind === "update");
    expect(create).toMatchObject({ kind: "create", assignee_name: "Alice", due_date: "2026-10-30" });
    expect(update).toMatchObject({ kind: "update", task_id: "t-login", changes: { status: "done" } });
    expect(result.usage.inputTokens).toBeGreaterThan(0);
  });

  it("rejects invalid input so the model can correct itself", async () => {
    const model = scriptedModel([
      [
        // 日期格式错误、成员不存在、标题与已有任务重复：都应该被拒绝
        { name: "propose_create_task", input: { ...createInput, due_date: "next Friday" } },
        { name: "propose_create_task", input: { ...createInput, assignee_id: "m-unknown" } },
        { name: "propose_create_task", input: { ...createInput, title: "修复登录页面样式问题" } },
        // 不存在的任务 id、没有任何改动的更新：也应该被拒绝
        { name: "propose_update_task", input: { ...updateInput, task_id: "t-missing" } },
        { name: "propose_update_task", input: { ...updateInput, status: "in_progress" } },
      ],
      // 模型看到错误后修正参数，重新提交
      [{ name: "propose_create_task", input: createInput }],
      "总结",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({ kind: "create", title: "整理访谈结论文档" });
    // 5 次被拒绝的调用都应该记录在执行过程里
    expect(result.steps.filter((s) => s.rejected)).toHaveLength(5);
  });

  it("does not create duplicate proposals", async () => {
    const model = scriptedModel([
      [
        { name: "propose_create_task", input: createInput },
        { name: "propose_create_task", input: createInput },
      ],
      "总结",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });
    expect(result.proposals).toHaveLength(1);
  });
});
