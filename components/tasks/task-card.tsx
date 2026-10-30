"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, MessagesSquare, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, updateTaskStatus } from "@/app/tasks/actions";
import { PRIORITY_META, STATUSES, STATUS_META, formatDate } from "@/lib/task-meta";
import type { Member, Task, TaskStatus } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

type Props = {
  task: Task;
  today: string;
  members: Member[];
  /** 看板里用的紧凑样式：不显示描述，状态由所在列表示 */
  compact?: boolean;
  /** 显示"来自哪场会议"的链接（会议详情页里不需要） */
  showMeeting?: boolean;
  /** 看板拖拽手柄，由外层传入 */
  dragHandle?: React.ReactNode;
};

export function TaskCard({ task, today, members, compact, showMeeting = true, dragHandle }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const status = STATUS_META[task.status];
  const priority = PRIORITY_META[task.priority];
  const StatusIcon = status.icon;
  const overdue = task.due_date !== null && task.due_date < today && task.status !== "done";

  function changeStatus(next: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, next);
      if (result.ok) toast.success(`已标记为「${STATUS_META[next].label}」`);
      else toast.error(`更新失败：${result.error}`);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) toast.success("任务已删除");
      else toast.error(`删除失败：${result.error}`);
    });
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border bg-card shadow-xs transition-all hover:shadow-sm",
        compact ? "p-3" : "p-4",
        pending && "opacity-60"
      )}
    >
      {dragHandle ?? <StatusIcon className={cn("mt-0.5 size-5 shrink-0", status.className)} />}

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "font-medium leading-tight",
              task.status === "done" && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </h3>
          <Badge className={cn("border-0", priority.className)}>
            {priority.label}优先级
          </Badge>
        </div>

        {!compact && task.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <UserRound className="size-3.5" />
            {task.assignee?.name ?? "未分配"}
          </span>
          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1",
                overdue && "font-medium text-red-600 dark:text-red-400"
              )}
            >
              <CalendarDays className="size-3.5" />
              {formatDate(task.due_date)}
              {overdue && " · 已逾期"}
            </span>
          )}
          {!compact && (
            <span className={cn("flex items-center gap-1", status.className)}>{status.label}</span>
          )}
          {showMeeting && task.meeting && (
            <Link
              href={`/meetings/${task.meeting.id}`}
              className="flex max-w-48 items-center gap-1 truncate hover:text-foreground hover:underline"
              title={`来自会议：${task.meeting.title}`}
            >
              <MessagesSquare className="size-3.5 shrink-0" />
              <span className="truncate">{task.meeting.title}</span>
            </Link>
          )}
        </div>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            aria-label="任务操作"
            disabled={pending}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            编辑
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>更改状态</DropdownMenuLabel>
          {STATUSES.filter((s) => s !== task.status).map((s) => {
            const Icon = STATUS_META[s].icon;
            return (
              <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
                <Icon className={STATUS_META[s].className} />
                {STATUS_META[s].label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} members={members} task={task} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条任务？</AlertDialogTitle>
            <AlertDialogDescription>
              「{task.title}」将被永久删除，此操作无法撤销。
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
