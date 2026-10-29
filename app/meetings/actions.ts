"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

const MAX_TRANSCRIPT_LENGTH = 20000;

type MeetingInput = { title: string; meeting_date: string; transcript: string };

function parseMeetingForm(
  formData: FormData
): { ok: true; data: MeetingInput } | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const meetingDate = String(formData.get("meeting_date") ?? "");
  const transcript = String(formData.get("transcript") ?? "").trim();

  if (!title) return { ok: false, error: "会议标题不能为空" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) return { ok: false, error: "请选择会议日期" };
  if (!transcript) return { ok: false, error: "会议记录不能为空" };
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    return { ok: false, error: `会议记录不能超过 ${MAX_TRANSCRIPT_LENGTH} 字` };
  }
  return { ok: true, data: { title, meeting_date: meetingDate, transcript } };
}

export async function createMeeting(formData: FormData): Promise<ActionResult> {
  const parsed = parseMeetingForm(formData);
  if (!parsed.ok) return parsed;

  const { data, error } = await getSupabase()
    .from("meetings")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meetings");
  redirect(`/meetings/${data.id}`);
}

export async function updateMeeting(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseMeetingForm(formData);
  if (!parsed.ok) return parsed;

  const { error } = await getSupabase().from("meetings").update(parsed.data).eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meetings", "layout");
  redirect(`/meetings/${id}`);
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  const { error } = await getSupabase().from("meetings").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meetings", "layout");
  revalidatePath("/tasks");
  redirect("/meetings");
}
