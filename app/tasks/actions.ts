"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult, TaskPriority, TaskStatus } from "@/lib/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export async function createTask(formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "任务标题不能为空" };

  const description = String(formData.get("description") ?? "").trim();
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const p = String(formData.get("priority") ?? "medium") as TaskPriority;

  const { error } = await getSupabase()
    .from("tasks")
    .insert({
      title,
      description: description || null,
      assignee_id: assigneeId && assigneeId !== "none" ? assigneeId : null,
      due_date: dueDate || null,
      priority: PRIORITIES.includes(p) ? p : "medium",
    });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<ActionResult> {
  if (!STATUSES.includes(status)) return { ok: false, error: "无效的状态" };

  const { error } = await getSupabase()
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/tasks");
  return { ok: true };
}
