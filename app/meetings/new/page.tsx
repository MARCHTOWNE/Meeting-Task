import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { createMeeting } from "@/app/meetings/actions";
import { todayInMelbourne } from "@/lib/task-meta";
import { MeetingForm } from "@/components/meetings/meeting-form";

export default async function NewMeetingPage() {
  await connection();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回会议列表
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">新建会议</h1>
        <p className="text-sm text-muted-foreground">
          粘贴会议记录。保存后可以在会议详情页让 AI 提取任务。
        </p>
      </div>

      <MeetingForm
        action={createMeeting}
        defaultDate={todayInMelbourne()}
        cancelHref="/meetings"
        submitLabel="保存会议"
      />
    </main>
  );
}
