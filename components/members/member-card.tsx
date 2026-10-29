"use client";

import { useState, useTransition } from "react";
import { Mail, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMember } from "@/app/members/actions";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberDialog } from "@/components/members/member-dialog";

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
];

/** 根据名字算出固定的头像颜色，同一个人每次颜色都一样 */
function avatarColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export type MemberStats = { open: number; inProgress: number; done: number };

export function MemberCard({ member, stats }: { member: Member; stats: MemberStats }) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const total = stats.open + stats.inProgress + stats.done;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (result.ok) toast.success(`已删除成员 ${member.name}`);
      else toast.error(`删除失败：${result.error}`);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-sm",
        pending && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold",
            avatarColor(member.name)
          )}
          aria-hidden
        >
          {member.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{member.name}</h3>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            {member.email ?? "未填写邮箱"}
          </p>
        </div>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
              aria-label={`${member.name} 的操作`}
              disabled={pending}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              编辑
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
              <Trash2 />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-3 divide-x rounded-lg bg-muted/50 py-2 text-center">
        <Stat label="待办" value={stats.open} />
        <Stat label="进行中" value={stats.inProgress} />
        <Stat label="已完成" value={stats.done} />
      </div>

      {total > 0 && (
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="bg-emerald-500" style={{ width: `${(stats.done / total) * 100}%` }} />
          <div className="bg-blue-500" style={{ width: `${(stats.inProgress / total) * 100}%` }} />
        </div>
      )}

      <MemberDialog open={editOpen} onOpenChange={setEditOpen} member={member} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除成员 {member.name}？</AlertDialogTitle>
            <AlertDialogDescription>
              {total > 0
                ? `TA 负责的 ${total} 个任务会保留，但会变成「未分配」。`
                : "此操作无法撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
