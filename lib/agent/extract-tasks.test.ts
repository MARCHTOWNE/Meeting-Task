import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { extractTasks } from "./extract-tasks";
import { buildCalendar } from "./prompt";
import { titleSimilarity } from "./tools";
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
  due_phrase: null,
  work_status: "not_started",
  priority: "medium",
  source_quote: "Alice：我周五前把访谈结论整理成文档。",
  is_distinct_from_existing: null,
};

const updateInput = {
  task_id: "t-login",
  status: "done",
  due_date: null,
  due_phrase: null,
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

  it("uses the summary from finish, rejects long summaries and stops right after finish", async () => {
    let calls = 0;
    const base = scriptedModel([
      [{ name: "finish", input: { summary: "很长的摘要".repeat(40) } }],
      [{ name: "finish", input: { summary: "确认登录问题已修复，Alice 整理访谈结论。" } }],
      "这一轮不应该被调用",
    ]);
    const model = new MockLanguageModelV4({
      doGenerate: async (options) => {
        calls++;
        return base.doGenerate(options);
      },
    });

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });

    expect(result.summary).toBe("确认登录问题已修复，Alice 整理访谈结论。");
    expect(result.steps.filter((s) => s.tool === "finish" && s.rejected)).toHaveLength(1);
    expect(calls).toBe(2);
  });

  it("warns about tasks that look like existing work, unless marked distinct", async () => {
    const similar = { ...createInput, title: "修复登录页面样式" };
    const model = scriptedModel([
      [{ name: "propose_create_task", input: similar }],
      [{ name: "propose_create_task", input: { ...similar, is_distinct_from_existing: true } }],
      "总结",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });

    expect(result.steps[0]).toMatchObject({ tool: "propose_create_task", rejected: true });
    expect(result.proposals).toHaveLength(1);
  });
});

describe("quality guards", () => {
  it("does not create a task for work that is already finished", async () => {
    const model = scriptedModel([
      [{ name: "propose_create_task", input: { ...createInput, title: "上线新首页", work_status: "done" } }],
      "总结",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });

    expect(result.proposals).toHaveLength(0);
    expect(result.steps[0]).toMatchObject({ tool: "propose_create_task", rejected: true });
  });

  it("computes the due date from the transcript phrase instead of trusting the model", async () => {
    // 会议是 2026-10-27（周二），"下周一" 应该是 2026-11-02；模型错给了 2026-11-01（周日）
    const model = scriptedModel([
      [{ name: "propose_create_task", input: { ...createInput, due_date: "2026-11-01", due_phrase: "下周一前完成" } }],
      [{ name: "propose_update_task", input: { ...updateInput, status: null, due_date: "2026-10-31", due_phrase: "这周五" } }],
      "总结",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });

    const create = result.proposals.find((p) => p.kind === "create");
    const update = result.proposals.find((p) => p.kind === "update");
    expect(create).toMatchObject({ due_date: "2026-11-02" });
    expect(update).toMatchObject({ changes: { due_date: "2026-10-30" } });
    expect(result.steps.some((s) => s.summary.includes("已按「下周一前完成」校正"))).toBe(true);
  });

  it("falls back to the model's date when the phrase cannot be resolved", async () => {
    const model = scriptedModel([
      [{ name: "propose_create_task", input: { ...createInput, due_date: "2026-10-31", due_phrase: "月底" } }],
      "总结",
    ]);

    const result = await extractTasks({ model, modelName: "mock", dataSource, meeting });
    expect(result.proposals[0]).toMatchObject({ due_date: "2026-10-31" });
  });
});

describe("helpers", () => {
  it("builds a calendar so the model can look up relative dates", () => {
    const calendar = buildCalendar("2026-10-29"); // 星期四
    expect(calendar).toContain("2026-10-29 Thu (meeting day)");
    expect(calendar).toContain("2026-10-30 Fri (this week)");
    expect(calendar).toContain("2026-11-02 Mon (next week)");
    expect(calendar).toContain("2026-11-09 Mon (in two weeks)");
  });

  it("scores similar titles higher than unrelated ones", () => {
    expect(titleSimilarity("完善 README", "准备项目 README")).toBeGreaterThanOrEqual(0.6);
    expect(titleSimilarity("整理访谈结论", "修复登录页面样式问题")).toBeLessThan(0.3);
  });
});
