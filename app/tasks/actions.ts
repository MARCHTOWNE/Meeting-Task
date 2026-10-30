"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult, TaskStatus } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/tasks");
  revalidatePath("/members");
  revalidatePath("/meetings", "layout");
}

const statusSchema = z.enum(["todo", "in_progress", "done"]);

/** 新建和编辑共用的表单校验。下拉框里"未分配"的值是 "none"，空字符串表示没填 */
const taskFormSchema = z.object({
  title: z.string().trim().min(1, "任务标题不能为空").max(100, "标题不能超过 100 个字"),
  description: z
    .string()
    .trim()
    .max(1000, "描述不能超过 1000 个字")
    .transform((v) => v || null),
  assignee_id: z
    .union([z.uuid(), z.literal("none"), z.literal("")])
    .transform((v) => (v === "none" || v === "" ? null : v)),
  due_date: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
    .transform((v) => v || null),
  priority: z.enum(["low", "medium", "high"]),
  status: statusSchema.optional(),
});

function parseTaskForm(formData: FormData) {
  const raw = Object.fromEntries(
    ["title", "description", "assignee_id", "due_date", "priority", "status"]
      .filter((k) => formData.has(k))
      .map((k) => [k, String(formData.get(k))])
  );
  const parsed = taskFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "表单数据不正确" };
  }
  return { ok: true as const, data: parsed.data };
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return parsed;

  const { error } = await getSupabase().from("tasks").insert(parsed.data);

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updateTask(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return parsed;

  const { error } = await getSupabase()
    .from("tasks")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  if (!statusSchema.safeParse(status).success) return { ok: false, error: "无效的状态" };

  const { error } = await getSupabase()
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
