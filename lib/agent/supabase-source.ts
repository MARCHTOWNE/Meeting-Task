import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { AgentDataSource } from "./types";

/** 用 Supabase 实现 Agent 的数据接口 */
export function supabaseDataSource(): AgentDataSource {
  const db = getSupabase();
  return {
    async listMembers() {
      const { data, error } = await db.from("members").select("id, name, email").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async listTasks() {
      const { data, error } = await db
        .from("tasks")
        .select("id, title, status, priority, due_date, assignee_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  };
}
