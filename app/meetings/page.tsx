import Link from "next/link";
import { connection } from "next/server";
import { CalendarDays, ChevronRight, ListTodo, MessagesSquare, Plus } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/task-meta";
import type { Meeting } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type MeetingRow = Meeting & { tasks: { count: number }[] };

export default async function MeetingsPage() {
  await connection();

  const { data, error } = await getSupabase()
    .from("meetings")
    .select("*, tasks(count)")
    .order("meeting_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-destructive">加载失败：{error.message}</p>
      </main>
    );
  }

  const meetings = (data ?? []) as MeetingRow[];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">会议</h1>
          <p className="text-sm text-muted-foreground">
            保存会议记录，之后可以让 AI 从中提取任务。
          </p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Plus />
            新建会议
          </Link>
        </Button>
      </div>

      {meetings.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare />
            </EmptyMedia>
            <EmptyTitle>还没有会议</EmptyTitle>
            <EmptyDescription>新建一场会议，粘贴会议记录开始使用。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/meetings/new">
                <Plus />
                新建会议
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {meetings.map((m) => {
            const taskCount = m.tasks?.[0]?.count ?? 0;
            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <MessagesSquare className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{m.title}</h3>
                    <Badge variant="secondary" className="gap-1">
                      <ListTodo />
                      {taskCount} 个任务
                    </Badge>
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {m.transcript.replace(/\s+/g, " ")}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDate(m.meeting_date)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
