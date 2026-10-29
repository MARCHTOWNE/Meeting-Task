import { Circle, CircleCheck, CircleDashed, type LucideIcon } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const STATUS_META: Record<
  TaskStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  todo: {
    label: "待办",
    icon: Circle,
    className: "text-muted-foreground",
  },
  in_progress: {
    label: "进行中",
    icon: CircleDashed,
    className: "text-blue-600 dark:text-blue-400",
  },
  done: {
    label: "已完成",
    icon: CircleCheck,
    className: "text-emerald-600 dark:text-emerald-400",
  },
};

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  low: {
    label: "低",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  medium: {
    label: "中",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  high: {
    label: "高",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

/** "2026-11-02" -> "11月2日" */
export function formatDate(date: string) {
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

/** 今天的日期（墨尔本时区），格式 YYYY-MM-DD */
export function todayInMelbourne() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
  }).format(new Date());
}
