import { connection } from "next/server";
import { Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import type { Member, TaskStatus } from "@/lib/types";
import { AddMemberButton } from "@/components/members/add-member-button";
import { MemberCard, type MemberStats } from "@/components/members/member-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type MemberRow = Member & { tasks: { status: TaskStatus }[] };

function countByStatus(tasks: { status: TaskStatus }[]): MemberStats {
  return {
    open: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
}

export default async function MembersPage() {
  await connection();

  // tasks(status)：通过 tasks.assignee_id 外键，把每个成员负责的任务状态一起查出来
  const { data, error } = await getSupabase()
    .from("members")
    .select("id, name, email, tasks(status)")
    .order("name");

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-destructive">加载失败：{error.message}</p>
      </main>
    );
  }

  const members = (data ?? []) as MemberRow[];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">成员</h1>
          <p className="text-sm text-muted-foreground">
            团队成员和他们手上的任务。
          </p>
        </div>
        <AddMemberButton />
      </div>

      {members.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>还没有成员</EmptyTitle>
            <EmptyDescription>添加团队成员后，就可以把任务指派给他们。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map(({ tasks, ...member }) => (
            <MemberCard key={member.id} member={member} stats={countByStatus(tasks ?? [])} />
          ))}
        </div>
      )}
    </main>
  );
}
