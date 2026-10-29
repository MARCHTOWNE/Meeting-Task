import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays, FileText, ListTodo, Pencil, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { formatDate, todayInMelbourne } from "@/lib/task-meta";
import type { Meeting, Task } from "@/lib/types";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { TaskCard } from "@/components/tasks/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const supabase = getSupabase();

  const [meetingRes, tasksRes] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*, assignee:members(name)")
      .eq("meeting_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (meetingRes.error || !meetingRes.data) notFound();

  const meeting = meetingRes.data as Meeting;
  const tasks = (tasksRes.data ?? []) as Task[];
  const today = todayInMelbourne();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回会议列表
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {formatDate(meeting.meeting_date)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/meetings/${meeting.id}/edit`}>
                <Pencil />
                编辑
              </Link>
            </Button>
            <DeleteMeetingButton id={meeting.id} title={meeting.title} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              会议记录
            </CardTitle>
            <CardDescription>{meeting.transcript.length} 字</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[520px] overflow-y-auto rounded-lg bg-muted/50 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {meeting.transcript}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-dashed bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
                AI 提取任务
              </CardTitle>
              <CardDescription>
                AI 会读取会议记录，提议新建或更新任务，你确认后才会写入。
              </CardDescription>
              <CardAction>
                <Button size="sm" disabled>
                  <Sparkles />
                  开始提取
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">即将上线</Badge>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-medium">
              <ListTodo className="size-4 text-muted-foreground" />
              关联任务
              <span className="text-sm font-normal text-muted-foreground">{tasks.length}</span>
            </h2>
            {tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
                这场会议还没有关联任务。
              </p>
            ) : (
              tasks.map((t) => <TaskCard key={t.id} task={t} today={today} />)
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
