"use client";

import { useState, useTransition } from "react";
import { Bot, ChevronRight, Loader2, RotateCcw, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { extractTaskProposals } from "@/app/meetings/agent-actions";
import type { ExtractionResult } from "@/lib/agent/types";
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

export function ExtractPanel({ meetingId }: { meetingId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ExtractionResult | null>(null);

  function run() {
    startTransition(async () => {
      const res = await extractTaskProposals(meetingId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      const n = res.result.proposals.length;
      if (n === 0) toast.info("AI 没有在这场会议里找到新的任务");
      else toast.success(`AI 提出了 ${n} 条任务提议`);
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
            <Button size="sm" onClick={run} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : result ? <RotateCcw /> : <Sparkles />}
              {pending ? "分析中…" : result ? "重新提取" : "开始提取"}
            </Button>
          </CardAction>
        </CardHeader>
        {pending && (
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="size-4 animate-pulse" />
              AI 正在分析会议记录，通常需要 10–30 秒…
            </p>
          </CardContent>
        )}
      </Card>

      {result && !pending && (
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

          {result.proposals.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">
                任务提议 <span className="text-sm font-normal text-muted-foreground">{result.proposals.length}</span>
              </h3>
              {result.proposals.map((p) => (
                <ProposalCard key={p.id} proposal={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
