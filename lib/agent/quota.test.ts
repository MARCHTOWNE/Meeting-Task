import { afterEach, describe, expect, it, vi } from "vitest";
import { isUnlimited, quotaConfig } from "./quota";

afterEach(() => vi.unstubAllEnvs());

describe("quotaConfig", () => {
  it("defaults to one free extraction per account, forever", () => {
    vi.stubEnv("AI_FREE_LIMIT", "");
    vi.stubEnv("AI_QUOTA_WINDOW_HOURS", "");
    expect(quotaConfig()).toEqual({ limit: 1, windowHours: null });
  });

  it("reads limit and window from env", () => {
    vi.stubEnv("AI_FREE_LIMIT", "10");
    vi.stubEnv("AI_QUOTA_WINDOW_HOURS", "24");
    expect(quotaConfig()).toEqual({ limit: 10, windowHours: 24 });
  });

  it("ignores invalid values", () => {
    vi.stubEnv("AI_FREE_LIMIT", "abc");
    vi.stubEnv("AI_QUOTA_WINDOW_HOURS", "-5");
    expect(quotaConfig()).toEqual({ limit: 1, windowHours: null });
  });
});

describe("isUnlimited", () => {
  it("matches admin emails case-insensitively", () => {
    vi.stubEnv("AI_ADMIN_EMAILS", " Me@Example.com , other@x.com ");
    expect(isUnlimited("me@example.com")).toBe(true);
    expect(isUnlimited("OTHER@x.com")).toBe(true);
    expect(isUnlimited("someone@else.com")).toBe(false);
    expect(isUnlimited(null)).toBe(false);
  });

  it("nobody is unlimited when not configured", () => {
    vi.stubEnv("AI_ADMIN_EMAILS", "");
    expect(isUnlimited("me@example.com")).toBe(false);
  });
});
