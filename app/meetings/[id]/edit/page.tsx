import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { updateMeeting } from "@/app/meetings/actions";
import { getSupabase } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/types";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 页面框架（标题）是静态的，从会议详情点"编辑"时立刻显示；
 * 需要查数据库的部分（返回链接里的会议 ID、表单内容）放进 Suspense。
 */
export default function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <h1 className="text-2xl font-semibold tracking-tight">编辑会议</h1>
            </div>
            <Skeleton className="h-[520px] rounded-xl" />
          </>
        }
      >
        <EditMeeting params={params} />
      </Suspense>
    </main>
  );
}

async function EditMeeting({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const { data, error } = await (await getSupabase())
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const meeting = data as Meeting;

  return (
    <>
      <div className="space-y-2">
        <Link
          href={`/meetings/${meeting.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回会议详情
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">编辑会议</h1>
      </div>

      <MeetingForm
        action={updateMeeting.bind(null, meeting.id)}
        defaultDate={meeting.meeting_date}
        meeting={meeting}
        cancelHref={`/meetings/${meeting.id}`}
        submitLabel="保存修改"
      />
    </>
  );
}
