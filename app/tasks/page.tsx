import { connection } from "next/server";
import { ClipboardList } from "lucide-react";
import { getSupabase } from "@/lib/supabase/server";
import { STATUSES, STATUS_META, todayInMelbourne } from "@/lib/task-meta";
import type { Member, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateTaskButton } from "@/components/tasks/create-task-button";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskCard } from "@/components/tasks/task-card";
import { type TaskView, ViewSwitch } from "@/components/tasks/view-switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await connection();
  const { view: viewParam } = await searchParams;
  const view: TaskView = viewParam === "board" ? "board" : "list";
  const supabase = await getSupabase();

  const [tasksRes, membersRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:members(name), meeting:meetings(id, title)")
      .order("created_at", { ascending: false }),
    supabase.from("members").select("id, name, email").order("name"),
  ]);

  if (tasksRes.error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-destructive">加载失败：{tasksRes.error.message}</p>
      </main>
    );
  }

  const tasks = (tasksRes.data ?? []) as Task[];
  const members = (membersRes.data ?? []) as Member[];
  const today = todayInMelbourne();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">任务</h1>
          <p className="text-sm text-muted-foreground">
            管理所有任务，包括手动创建和从会议中提取的任务。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitch current={view} />
          <CreateTaskButton members={members} />
        </div>
      </div>

      {view === "list" && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {STATUSES.map((s) => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            const count = tasks.filter((t) => t.status === s).length;
            return (
              <Card key={s} className="gap-0 py-4">
                <CardContent className="flex items-center justify-between px-4">
                  <div>
                    <p className="text-xs text-muted-foreground sm:text-sm">{meta.label}</p>
                    <p className="text-2xl font-semibold tabular-nums">{count}</p>
                  </div>
                  <Icon className={cn("hidden size-8 opacity-80 sm:block", meta.className)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tasks.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>还没有任务</EmptyTitle>
            <EmptyDescription>点击右上角的「新建任务」，或在会议页让 AI 提取任务。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : view === "board" ? (
        <TaskBoard tasks={tasks} members={members} today={today} />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} today={today} members={members} />
          ))}
        </div>
      )}
    </main>
  );
}
