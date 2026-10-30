import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentDataSource } from "./types";

/** 用 Supabase 实现 Agent 的数据接口。传入的是当前用户的客户端，所以 Agent 也只能看到该用户的数据 */
export function supabaseDataSource(db: SupabaseClient): AgentDataSource {
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
