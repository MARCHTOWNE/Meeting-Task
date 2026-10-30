"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseMemberForm(
  formData: FormData
): { ok: true; data: { name: string; email: string | null } } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name) return { ok: false, error: "姓名不能为空" };
  if (name.length > 50) return { ok: false, error: "姓名不能超过 50 个字" };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "邮箱格式不正确" };
  return { ok: true, data: { name, email: email || null } };
}

function friendlyError(error: { code?: string; message: string }) {
  // 23505 = PostgreSQL 唯一约束冲突（email unique）
  if (error.code === "23505") return "这个邮箱已经被其他成员使用了";
  return error.message;
}

function revalidateAll() {
  revalidatePath("/members");
  revalidatePath("/tasks");
  revalidatePath("/meetings", "layout");
}

export async function createMember(formData: FormData): Promise<ActionResult> {
  const parsed = parseMemberForm(formData);
  if (!parsed.ok) return parsed;

  const { error } = await (await getSupabase()).from("members").insert(parsed.data);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidateAll();
  return { ok: true };
}

export async function updateMember(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseMemberForm(formData);
  if (!parsed.ok) return parsed;

  const { error } = await (await getSupabase()).from("members").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidateAll();
  return { ok: true };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  const { error } = await (await getSupabase()).from("members").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidateAll();
  return { ok: true };
}
