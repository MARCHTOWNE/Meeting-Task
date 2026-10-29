import { ArrowRight, CalendarDays, Plus, Quote, RefreshCw, UserRound } from "lucide-react";
import type { Proposal } from "@/lib/agent/types";
import { PRIORITY_META, STATUS_META, formatDate } from "@/lib/task-meta";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const isCreate = proposal.kind === "create";

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            "border-0",
            isCreate
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
          )}
        >
          {isCreate ? <Plus /> : <RefreshCw />}
          {isCreate ? "新建" : "更新"}
        </Badge>
        <h4 className="font-medium">{isCreate ? proposal.title : proposal.task_title}</h4>
      </div>

      {isCreate ? (
        <>
          {proposal.description && (
            <p className="text-sm text-muted-foreground">{proposal.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserRound className="size-3.5" />
              {proposal.assignee_name ?? "未分配"}
            </span>
            {proposal.due_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {formatDate(proposal.due_date)}
              </span>
            )}
            <Badge className={cn("border-0", PRIORITY_META[proposal.priority].className)}>
              {PRIORITY_META[proposal.priority].label}优先级
            </Badge>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <ul className="space-y-1 text-sm">
            {proposal.changes.status && (
              <ChangeRow label="状态" value={STATUS_META[proposal.changes.status].label} />
            )}
            {proposal.changes.due_date && (
              <ChangeRow label="截止日期" value={formatDate(proposal.changes.due_date)} />
            )}
            {proposal.changes.assignee_id && (
              <ChangeRow label="负责人" value={proposal.changes.assignee_name ?? "未知"} />
            )}
            {proposal.changes.priority && (
              <ChangeRow label="优先级" value={PRIORITY_META[proposal.changes.priority].label} />
            )}
          </ul>
          <p className="text-sm text-muted-foreground">{proposal.reason}</p>
        </div>
      )}

      <blockquote className="flex gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        <Quote className="mt-0.5 size-3.5 shrink-0" />
        <span>{proposal.source_quote}</span>
      </blockquote>
    </div>
  );
}

function ChangeRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{value}</span>
    </li>
  );
}
