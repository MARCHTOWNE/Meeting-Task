import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each([
    ["/meetings?x=1", "/meetings?x=1"],
    ["/tasks?view=board", "/tasks?view=board"],
  ])("keeps relative path %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/login", "", null, undefined])(
    "falls back to /tasks for %s",
    (input) => {
      expect(safeNext(input)).toBe("/tasks");
    }
  );
});
