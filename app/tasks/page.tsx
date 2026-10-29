import { getSupabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";
import { connection } from "next/server";

export default async function TasksPage() {
  await connection();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:members(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="p-8 text-red-600">加载失败：{error.message}</p>;
  }

  const tasks = (data ?? []) as Task[];

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">任务</h1>
      {tasks.length === 0 ? (
        <p className="text-gray-500">还没有任务</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.title}</span>
                <span className="text-sm text-gray-500">{t.status}</span>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                负责人：{t.assignee?.name ?? "未分配"} · 截止：
                {t.due_date ?? "无"} · 优先级：{t.priority}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}