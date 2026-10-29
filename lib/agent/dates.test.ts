import { describe, expect, it } from "vitest";
import { resolveDuePhrase } from "./dates";

// 2026-10-29 是星期四
const MEETING = "2026-10-29";

describe("resolveDuePhrase", () => {
  it.each([
    ["这周五之前", "2026-10-30"],
    ["本周五", "2026-10-30"],
    ["周五前", "2026-10-30"],
    ["下周一前完成", "2026-11-02"],
    ["下个星期三", "2026-11-04"],
    ["周二之前给大家看", "2026-11-03"], // 本周二已过，取最近的下一个周二
    ["下下周一", "2026-11-09"],
    ["明天", "2026-10-30"],
    ["后天", "2026-10-31"],
    ["by next Monday", "2026-11-02"],
    ["this Friday", "2026-10-30"],
    ["tomorrow", "2026-10-30"],
  ])("%s → %s", (phrase, expected) => {
    expect(resolveDuePhrase(phrase, MEETING)).toBe(expected);
  });

  it("returns null for phrases it cannot understand", () => {
    expect(resolveDuePhrase("月底", MEETING)).toBeNull();
    expect(resolveDuePhrase("尽快", MEETING)).toBeNull();
    expect(resolveDuePhrase("", MEETING)).toBeNull();
  });
});
