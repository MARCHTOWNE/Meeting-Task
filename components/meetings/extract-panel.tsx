"use client";

import { useState, useTransition } from "react";
import { Bot, CheckCheck, ChevronRight, Loader2, RotateCcw, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { applyProposals, extractTaskProposals } from "@/app/meetings/agent-actions";
import { toApplyInput } from "@/lib/agent/to-apply-input";
import type { ExtractionResult, Proposal } from "@/lib/agent/types";
import type { QuotaInfo } from "@/lib/agent/quota";
import type { Member } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProposalCard } from "@/components/meetings/proposal-card";

export function ExtractPanel({
  meetingId,
  members,
  quota,
}: {
  meetingId: string;
  members: Member[];
  quota: QuotaInfo;
}) {
  const [remaining, setRemaining] = useState(quota.remaining);
  const [extracting, startExtract] = useTransition();
  const [applying, startApply] = useTransition();
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const busy = extracting || applying;
  const selectedCount = proposals.filter((p) => selected.has(p.id)).length;

  function run() {
    startExtract(async () => {
      const res = await extractTaskProposals(meetingId);
      if (res.remaining !== undefined && Number.isFinite(res.remaining)) setRemaining(res.remaining);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      setProposals(res.result.proposals);
      setSelected(new Set(res.result.proposals.map((p) => p.id))); // 默认全选
      const n = res.result.proposals.length;
      if (n === 0) toast.info("AI 没有在这场会议里找到新的任务");
      else toast.success(`AI 提出了 ${n} 条任务提议，请确认`);
    });
  }

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function apply() {
    if (!result) return;
    const chosen = proposals.filter((p) => selected.has(p.id));
    startApply(async () => {
      const res = await applyProposals(toApplyInput(meetingId, result.summary, chosen));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const parts = [res.created && `新建 ${res.created} 条`, res.updated && `更新 ${res.updated} 条`].filter(Boolean);
      toast.success(`已写入：${parts.join("，")}任务`);
      setResult(null);
      setProposals([]);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
            AI 提取任务
          </CardTitle>
          <CardDescription>
            AI 会读取会议记录、查看成员和已有任务，提议新建或更新任务。你确认后才会写入。
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={run} disabled={busy || (!quota.unlimited && remaining === 0)}>
              {extracting ? <Loader2 className="animate-spin" /> : result ? <RotateCcw /> : <Sparkles />}
              {extracting ? "分析中…" : result ? "重新提取" : "开始提取"}
            </Button>
          </CardAction>
        </CardHeader>
        {!extracting && (
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {quota.unlimited ? (
                "管理员账号，不限次数"
              ) : (
                <>
                  {quota.windowHours ? `每 ${quota.windowHours} 小时可用 ${quota.limit} 次，` : "免费体验次数："}
                  剩余 <span className="font-medium text-foreground tabular-nums">{remaining}</span> / {quota.limit} 次
                  {remaining === 0 && (quota.windowHours ? "，稍后恢复" : "，已用完")}
                </>
              )}
            </p>
          </CardContent>
        )}
        {extracting && (
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="size-4 animate-pulse" />
              AI 正在分析会议记录，通常需要 10–30 秒…
            </p>
          </CardContent>
        )}
      </Card>

      {result && !extracting && (
        <div className="space-y-4">
          {result.summary && (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <p className="mb-1 text-xs font-medium text-muted-foreground">会议摘要</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>
          )}

          <details className="group rounded-xl border bg-card px-4 py-3 text-sm shadow-xs">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
              <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
              <Wrench className="size-4 text-muted-foreground" />
              Agent 执行过程
              <span className="font-normal text-muted-foreground">
                {result.steps.length} 次工具调用
                {result.steps.some((s) => s.rejected) &&
                  `，${result.steps.filter((s) => s.rejected).length} 次被校验退回`}
              </span>
            </summary>
            <ol className="mt-3 space-y-1.5 border-l pl-4">
              {result.steps.map((s, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{s.tool}</code>
                  <span className={s.rejected ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                    {s.rejected ? `已退回：${s.summary}` : s.summary}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              模型 {result.model} · 输入 {result.usage.inputTokens.toLocaleString()} tokens · 输出{" "}
              {result.usage.outputTokens.toLocaleString()} tokens
            </p>
          </details>

          {proposals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  任务提议{" "}
                  <span className="text-sm font-normal text-muted-foreground">{proposals.length}</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    setSelected(
                      selectedCount === proposals.length ? new Set() : new Set(proposals.map((p) => p.id))
                    )
                  }
                >
                  {selectedCount === proposals.length ? "全部取消" : "全选"}
                </Button>
              </div>

              {proposals.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  members={members}
                  selected={selected.has(p.id)}
                  disabled={busy}
                  onSelectedChange={(on) => toggle(p.id, on)}
                  onChange={(next) => setProposals((list) => list.map((x) => (x.id === next.id ? next : x)))}
                />
              ))}

              {/* 底部操作栏：滚动时始终可见 */}
              <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
                <p className="text-sm text-muted-foreground">
                  已选择 <span className="font-medium text-foreground">{selectedCount}</span> / {proposals.length} 条
                </p>
                <Button onClick={apply} disabled={busy || selectedCount === 0}>
                  {applying ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                  确认写入
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
