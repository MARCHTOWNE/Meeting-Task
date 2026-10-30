import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { createMeeting } from "@/app/meetings/actions";
import { todayInMelbourne } from "@/lib/task-meta";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 页面本身是静态的：标题和返回链接会被预渲染，点击"新建会议"时立刻显示。
 * 只有表单需要"今天的日期"（请求时才能确定），所以单独放进 Suspense 里。
 */
export default function NewMeetingPage() {
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

      <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
        <NewMeetingForm />
      </Suspense>
    </main>
  );
}

async function NewMeetingForm() {
  await connection();

  return (
    <MeetingForm
      action={createMeeting}
      defaultDate={todayInMelbourne()}
      cancelHref="/meetings"
      submitLabel="保存会议"
    />
  );
}
