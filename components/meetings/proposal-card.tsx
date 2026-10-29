"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Check, Pencil, Plus, Quote, RefreshCw, UserRound } from "lucide-react";
import type { CreateProposal, Proposal } from "@/lib/agent/types";
import { PRIORITY_META, STATUS_META, formatDate } from "@/lib/task-meta";
import type { Member, TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  proposal: Proposal;
  members: Member[];
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onChange: (proposal: Proposal) => void;
  disabled?: boolean;
};

export function ProposalCard({ proposal, members, selected, onSelectedChange, onChange, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const isCreate = proposal.kind === "create";
  const checkboxId = `proposal-${proposal.id}`;

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 shadow-xs transition-all",
        selected ? "border-primary/40 ring-1 ring-primary/10" : "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          className="mt-1"
          checked={selected}
          disabled={disabled}
          onCheckedChange={(v) => onSelectedChange(v === true)}
          aria-label="选择这条提议"
        />
        <div className="min-w-0 flex-1 space-y-3">
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
            <label htmlFor={checkboxId} className="cursor-pointer font-medium">
              {isCreate ? proposal.title : proposal.task_title}
            </label>
            {isCreate && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-muted-foreground"
                onClick={() => setEditing((v) => !v)}
                disabled={disabled}
              >
                {editing ? <Check /> : <Pencil />}
                {editing ? "完成" : "修改"}
              </Button>
            )}
          </div>

          {isCreate && editing ? (
            <CreateEditor proposal={proposal} members={members} onChange={onChange} />
          ) : isCreate ? (
            <CreateSummary proposal={proposal} />
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
      </div>
    </div>
  );
}

function CreateSummary({ proposal }: { proposal: CreateProposal }) {
  return (
    <>
      {proposal.description && <p className="text-sm text-muted-foreground">{proposal.description}</p>}
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
  );
}

function CreateEditor({
  proposal,
  members,
  onChange,
}: {
  proposal: CreateProposal;
  members: Member[];
  onChange: (p: Proposal) => void;
}) {
  const update = (patch: Partial<CreateProposal>) => onChange({ ...proposal, ...patch });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input
        className="sm:col-span-2"
        value={proposal.title}
        onChange={(e) => update({ title: e.target.value })}
        aria-label="任务标题"
        maxLength={100}
      />
      <Select
        value={proposal.assignee_id ?? "none"}
        onValueChange={(v) => {
          const m = members.find((x) => x.id === v);
          update({ assignee_id: m?.id ?? null, assignee_name: m?.name ?? null });
        }}
      >
        <SelectTrigger className="w-full" aria-label="负责人">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">未分配</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          value={proposal.due_date ?? ""}
          onChange={(e) => update({ due_date: e.target.value || null })}
          aria-label="截止日期"
        />
        <Select value={proposal.priority} onValueChange={(v) => update({ priority: v as TaskPriority })}>
          <SelectTrigger className="w-full" aria-label="优先级">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">低</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="high">高</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
