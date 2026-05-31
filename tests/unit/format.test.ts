import { describe, expect, it } from "vitest";

import { formatMoney, getGreeting, titleCase } from "@/lib/format";

// Intl's ZA currency formatter separates "R" from the amount with a
// non-breaking space; use an explicit   so the assertion is unambiguous.
const NBSP = " ";

// Africa/Johannesburg is UTC+2 with no DST.
function saHour(hour: number): Date {
  return new Date(Date.UTC(2026, 4, 30, hour - 2, 0, 0));
}

describe("format helpers", () => {
  it("formats values as South African Rand", () => {
    expect(formatMoney(85)).toBe(`R${NBSP}85,00`);
    expect(formatMoney("120.5")).toBe(`R${NBSP}120,50`);
  });

  it("normalizes status-like text into title case", () => {
    expect(titleCase("awaiting_buyer_eft")).toBe("Awaiting Buyer Eft");
    expect(titleCase("provider approved")).toBe("Provider Approved");
  });

  it("returns a time-of-day greeting in South African time", () => {
    expect(getGreeting(saHour(5))).toBe("Good morning");
    expect(getGreeting(saHour(11))).toBe("Good morning");
    expect(getGreeting(saHour(12))).toBe("Good afternoon");
    expect(getGreeting(saHour(16))).toBe("Good afternoon");
    expect(getGreeting(saHour(17))).toBe("Good evening");
    expect(getGreeting(saHour(23))).toBe("Good evening");
    expect(getGreeting(saHour(4))).toBe("Good evening");
  });
});
