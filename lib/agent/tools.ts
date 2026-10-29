import { tool } from "ai";
import { z } from "zod";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { resolveDuePhrase } from "./dates";
import { MAX_SUMMARY_LENGTH } from "./prompt";
import type { AgentDataSource, AgentStep, Proposal } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PROPOSALS = 20;

function isValidDate(value: string) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[\s\p{P}]+/gu, "");
}

/** 两个标题的相似度（0~1），用字符二元组的 Dice 系数计算，中英文都适用 */
export function titleSimilarity(a: string, b: string) {
  const bigrams = (s: string) => {
    const t = normalize(s);
    const out: string[] = [];
    for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
    return out;
  };
  const x = bigrams(a);
  const y = bigrams(b);
  if (x.length === 0 || y.length === 0) return normalize(a) === normalize(b) ? 1 : 0;
  const pool = [...y];
  let common = 0;
  for (const g of x) {
    const i = pool.indexOf(g);
    if (i !== -1) {
      common++;
      pool.splice(i, 1);
    }
  }
  return (2 * common) / (x.length + y.length);
}

/** 相似度超过这个值，就认为可能是同一件事 */
const SIMILARITY_THRESHOLD = 0.6;

/**
 * 创建 Agent 的工具。
 * - 读工具（list_members / search_tasks）直接查数据并返回给模型
 * - 写工具（propose_*）不碰数据库，只把"提议"收集到 proposals 里，等人工确认
 * 每个工具都会校验模型给出的参数，出错时把原因返回给模型，让它自己修正
 */
export function createAgentTools(ds: AgentDataSource, { meetingDate }: { meetingDate: string }) {
  const proposals: Proposal[] = [];
  const steps: AgentStep[] = [];
  let members: Awaited<ReturnType<AgentDataSource["listMembers"]>> | null = null;
  let tasks: Awaited<ReturnType<AgentDataSource["listTasks"]>> | null = null;
  let summary: string | null = null;

  const getMembers = async () => (members ??= await ds.listMembers());
  const getTasks = async () => (tasks ??= await ds.listTasks());
  const nextId = () => `p${proposals.length + 1}`;

  /**
   * 确定截止日期：优先用代码从原文说法（如"下周一前"）换算出的日期，换算不了才用模型给的日期。
   * 返回 note 用于在执行过程里说明"日期已被校正"。
   */
  function resolveDueDate(phrase: string | null, modelDate: string | null) {
    const resolved = phrase ? resolveDuePhrase(phrase, meetingDate) : null;
    if (resolved) {
      const note = modelDate && modelDate !== resolved ? `（模型给的 ${modelDate}，已按「${phrase}」校正）` : "";
      return { ok: true as const, date: resolved, note };
    }
    if (modelDate !== null && !isValidDate(modelDate)) {
      return { ok: false as const, error: `Invalid due_date "${modelDate}". Use YYYY-MM-DD or null.` };
    }
    return { ok: true as const, date: modelDate, note: "" };
  }

  /** 拒绝一次工具调用：记录到执行过程，并把原因返回给模型，让它自己修正 */
  function reject(toolName: string, error: string) {
    steps.push({ tool: toolName, summary: error, rejected: true });
    return { error };
  }

  async function resolveAssignee(id: string | null) {
    if (id === null) return { ok: true as const, id: null, name: null };
    const m = (await getMembers()).find((x) => x.id === id);
    if (!m) return { ok: false as const, error: `Unknown assignee_id "${id}". Use an id from list_members, or null.` };
    return { ok: true as const, id: m.id, name: m.name };
  }

  const tools = {
    list_members: tool({
      description: "List all team members (id, name, email). Call this before assigning tasks.",
      inputSchema: z.object({}),
      execute: async () => {
        const list = await getMembers();
        steps.push({ tool: "list_members", summary: `读取了 ${list.length} 位成员` });
        return list.map(({ id, name, email }) => ({ id, name, email }));
      },
    }),

    search_tasks: tool({
      description:
        "Search existing tasks by keyword in the title. Pass an empty query to list all tasks. Use this to avoid duplicates and to find tasks that should be updated.",
      inputSchema: z.object({
        query: z.string().describe("Keyword to search in task titles, or empty string for all tasks"),
      }),
      execute: async ({ query }) => {
        const all = await getTasks();
        const q = normalize(query);
        const result = (q ? all.filter((t) => normalize(t.title).includes(q)) : all).slice(0, 50);
        steps.push({
          tool: "search_tasks",
          summary: query ? `搜索任务「${query}」，找到 ${result.length} 条` : `查看了全部 ${result.length} 条任务`,
        });
        return result;
      },
    }),

    propose_create_task: tool({
      description: "Propose a NEW task for the user to review. Nothing is saved until the user confirms.",
      inputSchema: z.object({
        title: z.string().describe("Short task title starting with a verb"),
        description: z.string().nullable().describe("Optional details, or null"),
        assignee_id: z.string().nullable().describe("Member id from list_members, or null"),
        due_date: z.string().nullable().describe("YYYY-MM-DD, or null if no deadline was mentioned"),
        due_phrase: z
          .string()
          .nullable()
          .describe('The exact words in the transcript that state the deadline, e.g. "下周一前" or "by Friday", or null'),
        work_status: z
          .enum(["not_started", "in_progress", "done"])
          .describe("Status of this work according to the transcript. Use done if someone says it is finished"),
        priority: z.enum(["low", "medium", "high"]),
        source_quote: z.string().describe("Exact sentence from the transcript"),
        is_distinct_from_existing: z
          .boolean()
          .nullable()
          .describe("Set true only if you were warned about a similar task and it really is different work"),
      }),
      execute: async (input) => {
        if (proposals.length >= MAX_PROPOSALS) return reject("propose_create_task", "Too many proposals. Stop and write the summary.");

        const title = input.title.trim();
        if (!title) return reject("propose_create_task", "title must not be empty.");

        // 已经做完的事不应该变成待办
        if (input.work_status === "done") {
          return reject(
            "propose_create_task",
            "This work is already finished according to the transcript, so do not create a task. If an existing task covers it, call propose_update_task with status done; otherwise skip it."
          );
        }

        const due = resolveDueDate(input.due_phrase, input.due_date);
        if (!due.ok) return reject("propose_create_task", due.error);

        const assignee = await resolveAssignee(input.assignee_id);
        if (!assignee.ok) return reject("propose_create_task", assignee.error);

        const existing = (await getTasks()).find((t) => normalize(t.title) === normalize(title));
        if (existing) {
          return reject(
            "propose_create_task",
            `A task with this title already exists (id ${existing.id}). Use propose_update_task if something changed, otherwise skip it.`
          );
        }
        if (proposals.some((p) => p.kind === "create" && normalize(p.title) === normalize(title))) {
          return reject("propose_create_task", "You already proposed this task. Skip it.");
        }

        // 标题相似但不完全相同：可能是同一件事换了说法，提醒模型确认
        if (!input.is_distinct_from_existing) {
          const similar = (await getTasks()).find((t) => titleSimilarity(t.title, title) >= SIMILARITY_THRESHOLD);
          if (similar) {
            return reject(
              "propose_create_task",
              `Existing task "${similar.title}" (id ${similar.id}) looks like the same work. Use propose_update_task for it instead. If it really is different work, call again with is_distinct_from_existing: true.`
            );
          }
          const similarProposal = proposals.find(
            (p) => p.kind === "create" && titleSimilarity(p.title, title) >= SIMILARITY_THRESHOLD
          );
          if (similarProposal) {
            return reject(
              "propose_create_task",
              `You already proposed a similar task "${similarProposal.kind === "create" ? similarProposal.title : ""}". Skip it.`
            );
          }
        }

        const id = nextId();
        proposals.push({
          id,
          kind: "create",
          title,
          description: input.description?.trim() || null,
          assignee_id: assignee.id,
          assignee_name: assignee.name,
          due_date: due.date,
          priority: input.priority as TaskPriority,
          source_quote: input.source_quote.trim(),
        });
        steps.push({ tool: "propose_create_task", summary: `提议新建「${title}」${due.note}` });
        return { ok: true, proposal_id: id };
      },
    }),

    propose_update_task: tool({
      description:
        "Propose a change to an EXISTING task (e.g. mark it done, change deadline or owner). Only include fields that change. Nothing is saved until the user confirms.",
      inputSchema: z.object({
        task_id: z.string().describe("Id of an existing task from search_tasks"),
        status: z.enum(["todo", "in_progress", "done"]).nullable().describe("New status, or null if unchanged"),
        due_date: z.string().nullable().describe("New YYYY-MM-DD, or null if unchanged"),
        due_phrase: z
          .string()
          .nullable()
          .describe('The exact words that state the new deadline, e.g. "下周一前", or null if unchanged'),
        assignee_id: z.string().nullable().describe("New member id, or null if unchanged"),
        priority: z.enum(["low", "medium", "high"]).nullable().describe("New priority, or null if unchanged"),
        reason: z.string().describe("Why this change is needed, in the transcript's language"),
        source_quote: z.string().describe("Exact sentence from the transcript"),
      }),
      execute: async (input) => {
        if (proposals.length >= MAX_PROPOSALS) return reject("propose_update_task", "Too many proposals. Stop and write the summary.");

        const task = (await getTasks()).find((t) => t.id === input.task_id);
        if (!task) return reject("propose_update_task", `Unknown task_id "${input.task_id}". Call search_tasks to find the right id.`);
        if (proposals.some((p) => p.kind === "update" && p.task_id === task.id)) {
          return reject("propose_update_task", "You already proposed an update for this task. Skip it.");
        }

        const changes: Extract<Proposal, { kind: "update" }>["changes"] = {};
        if (input.status && input.status !== task.status) changes.status = input.status as TaskStatus;
        if (input.priority && input.priority !== task.priority) changes.priority = input.priority as TaskPriority;
        let dueNote = "";
        if (input.due_date || input.due_phrase) {
          const due = resolveDueDate(input.due_phrase, input.due_date);
          if (!due.ok) return reject("propose_update_task", due.error);
          if (due.date && due.date !== task.due_date) changes.due_date = due.date;
          dueNote = due.note;
        }
        if (input.assignee_id && input.assignee_id !== task.assignee_id) {
          const assignee = await resolveAssignee(input.assignee_id);
          if (!assignee.ok) return reject("propose_update_task", assignee.error);
          changes.assignee_id = assignee.id;
          changes.assignee_name = assignee.name;
        }
        if (Object.keys(changes).length === 0) {
          return reject("propose_update_task", "No field differs from the current task. Skip this update.");
        }

        const id = nextId();
        proposals.push({
          id,
          kind: "update",
          task_id: task.id,
          task_title: task.title,
          changes,
          reason: input.reason.trim(),
          source_quote: input.source_quote.trim(),
        });
        steps.push({ tool: "propose_update_task", summary: `提议更新「${task.title}」${dueNote}` });
        return { ok: true, proposal_id: id };
      },
    }),

    finish: tool({
      description: "Finish the work with a short meeting summary. Call this once, after all proposals.",
      inputSchema: z.object({
        summary: z
          .string()
          .describe(`1-2 sentences, at most ${MAX_SUMMARY_LENGTH} characters, no task list`),
      }),
      execute: async ({ summary: text }) => {
        const trimmed = text.trim();
        if (!trimmed) return reject("finish", "summary must not be empty.");
        if (trimmed.length > MAX_SUMMARY_LENGTH) {
          return reject(
            "finish",
            `Summary is ${trimmed.length} characters, the limit is ${MAX_SUMMARY_LENGTH}. Shorten it to 1-2 sentences without listing tasks.`
          );
        }
        summary = trimmed;
        steps.push({ tool: "finish", summary: `完成，摘要 ${trimmed.length} 字` });
        return { ok: true };
      },
    }),
  };

  return { tools, proposals, steps, getSummary: () => summary };
}
