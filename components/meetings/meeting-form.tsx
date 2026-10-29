"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult, Meeting } from "@/lib/types";
import { SAMPLE_MEETING } from "@/lib/sample-meeting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  defaultDate: string;
  meeting?: Pick<Meeting, "title" | "meeting_date" | "transcript">;
  cancelHref: string;
  submitLabel: string;
};

export function MeetingForm({ action, defaultDate, meeting, cancelHref, submitLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [transcript, setTranscript] = useState(meeting?.transcript ?? "");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      // 成功时服务端会直接跳转页面，只有失败时才会返回结果
      const result = await action(formData);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  function fillSample() {
    setTitle(SAMPLE_MEETING.title);
    setTranscript(SAMPLE_MEETING.transcript);
  }

  return (
    <form action={handleSubmit}>
      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div className="grid gap-2">
              <Label htmlFor="title">会议标题</Label>
              <Input
                id="title"
                name="title"
                placeholder="例如：产品周会"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting_date">会议日期</Label>
              <Input
                id="meeting_date"
                name="meeting_date"
                type="date"
                defaultValue={meeting?.meeting_date ?? defaultDate}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="transcript">会议记录</Label>
              {!meeting && (
                <Button type="button" variant="ghost" size="sm" onClick={fillSample}>
                  <Wand2 />
                  填入示例
                </Button>
              )}
            </div>
            <Textarea
              id="transcript"
              name="transcript"
              placeholder="粘贴会议记录或转写文本，每位发言人一行效果最好……"
              className="min-h-72 font-mono text-sm leading-relaxed"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              required
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {transcript.length} / 20000
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>取消</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
