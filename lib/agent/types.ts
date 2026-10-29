import type { TaskPriority, TaskStatus } from "@/lib/types";

/** Agent 提议新建一条任务（还没写入数据库） */
export type CreateProposal = {
  id: string;
  kind: "create";
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  priority: TaskPriority;
  source_quote: string;
};

/** Agent 提议修改一条已有任务（还没写入数据库） */
export type UpdateProposal = {
  id: string;
  kind: "update";
  task_id: string;
  task_title: string;
  changes: {
    status?: TaskStatus;
    due_date?: string | null;
    assignee_id?: string | null;
    assignee_name?: string | null;
    priority?: TaskPriority;
  };
  reason: string;
  source_quote: string;
};

export type Proposal = CreateProposal | UpdateProposal;

/** Agent 的一次工具调用记录；rejected 表示参数没通过校验、已退回给模型修正 */
export type AgentStep = { tool: string; summary: string; rejected?: boolean };

export type ExtractionResult = {
  summary: string;
  proposals: Proposal[];
  steps: AgentStep[];
  usage: { inputTokens: number; outputTokens: number };
  model: string;
};

/** Agent 需要读取的数据。用接口隔离数据库，方便在测试里替换成假数据 */
export type AgentDataSource = {
  listMembers(): Promise<{ id: string; name: string; email: string | null }[]>;
  listTasks(): Promise<
    {
      id: string;
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string | null;
      assignee_id: string | null;
    }[]
  >;
};
