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
};