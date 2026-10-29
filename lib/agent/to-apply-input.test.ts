import { describe, expect, it } from "vitest";
import { toApplyInput } from "./to-apply-input";
import type { Proposal } from "./types";

describe("toApplyInput", () => {
  it("splits proposals into creates and updates and drops display-only fields", () => {
    const proposals: Proposal[] = [
      {
        id: "p1",
        kind: "create",
        title: "整理访谈结论",
        description: null,
        assignee_id: "a",
        assignee_name: "Alice",
        due_date: "2026-10-30",
        priority: "high",
        source_quote: "q1",
      },
      {
        id: "p2",
        kind: "update",
        task_id: "t1",
        task_title: "修复登录页面",
        changes: { status: "done", assignee_id: "b", assignee_name: "Bob" },
        reason: "已修复",
        source_quote: "q2",
      },
    ];

    expect(toApplyInput("m1", "摘要", proposals)).toEqual({
      meetingId: "m1",
      summary: "摘要",
      creates: [
        {
          title: "整理访谈结论",
          description: null,
          assignee_id: "a",
          due_date: "2026-10-30",
          priority: "high",
          source_quote: "q1",
        },
      ],
      updates: [{ task_id: "t1", status: "done", assignee_id: "b" }],
    });
  });

  it("sends null summary when empty", () => {
    expect(toApplyInput("m1", "", []).summary).toBeNull();
  });
});
