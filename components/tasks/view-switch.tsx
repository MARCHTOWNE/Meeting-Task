import Link from "next/link";
import { Columns3, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskView = "list" | "board";

const VIEWS = [
  { value: "list", label: "列表", icon: List },
  { value: "board", label: "看板", icon: Columns3 },
] as const;

/** 列表 / 看板切换。用网址参数 ?view= 记录，刷新或分享链接都能保持当前视图 */
export function ViewSwitch({ current }: { current: TaskView }) {
  return (
    <div role="tablist" aria-label="切换视图" className="inline-flex rounded-lg border bg-background p-0.5">
      {VIEWS.map(({ value, label, icon: Icon }) => (
        <Link
          key={value}
          href={value === "list" ? "/tasks" : `/tasks?view=${value}`}
          role="tab"
          aria-selected={current === value}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
            current === value
              ? "bg-secondary font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}
