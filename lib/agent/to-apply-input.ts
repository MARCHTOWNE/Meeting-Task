import type { ApplyInput } from "@/app/meetings/agent-actions";
import type { Proposal } from "./types";

/** 把界面上的提议转换成写入接口需要的格式 */
export function toApplyInput(meetingId: string, summary: string, proposals: Proposal[]): ApplyInput {
  const creates: ApplyInput["creates"] = [];
  const updates: ApplyInput["updates"] = [];

  for (const p of proposals) {
    if (p.kind === "create") {
      creates.push({
        title: p.title,
        description: p.description,
        assignee_id: p.assignee_id,
        due_date: p.due_date,
        priority: p.priority,
        source_quote: p.source_quote,
      });
    } else {
      const { status, priority, due_date, assignee_id } = p.changes;
      updates.push({
        task_id: p.task_id,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(due_date && { due_date }),
        ...(assignee_id && { assignee_id }),
      });
    }
  }
  return { meetingId, summary: summary || null, creates, updates };
}
