export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Member = {
  id: string;
  name: string;
  email: string | null;
};

export type Task = {
  id: string;
  meeting_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  source_quote: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { name: string } | null;
  meeting?: { id: string; title: string } | null;
};

export type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string;
  summary: string | null;
  created_at: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
