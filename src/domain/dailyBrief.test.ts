import { describe, it, expect } from "vitest";
import { buildDailyBriefMessage, type DailyBriefInput } from "./dailyBrief";

describe("buildDailyBriefMessage", () => {
  it("Ambos 0 -> null", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 0, overdueCount: 0, totalOwedCents: 0 })).toBeNull();
  });

  it("dueToday=1, overdue=0, total=120000 -> Hoy vence 1 préstamo por S/1,200.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 1, overdueCount: 0, totalOwedCents: 120000 })).toBe("Hoy vence 1 préstamo por S/1,200.00.");
  });

  it("dueToday=3, overdue=0, total=360000 -> Hoy vencen 3 préstamos por S/3,600.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 3, overdueCount: 0, totalOwedCents: 360000 })).toBe("Hoy vencen 3 préstamos por S/3,600.00.");
  });

  it("dueToday=0, overdue=1, total=50000 -> Tienes 1 préstamo atrasado por S/500.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 0, overdueCount: 1, totalOwedCents: 50000 })).toBe("Tienes 1 préstamo atrasado por S/500.00.");
  });

  it("dueToday=0, overdue=2, total=100000 -> Tienes 2 préstamos atrasados por S/1,000.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 0, overdueCount: 2, totalOwedCents: 100000 })).toBe("Tienes 2 préstamos atrasados por S/1,000.00.");
  });

  it("dueToday=2, overdue=1, total=180000 -> Hoy: 2 por cobrar y 1 atrasado — total S/1,800.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 2, overdueCount: 1, totalOwedCents: 180000 })).toBe("Hoy: 2 por cobrar y 1 atrasado — total S/1,800.00.");
  });

  it("dueToday=2, overdue=3, total=240000 -> Hoy: 2 por cobrar y 3 atrasados — total S/2,400.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 2, overdueCount: 3, totalOwedCents: 240000 })).toBe("Hoy: 2 por cobrar y 3 atrasados — total S/2,400.00.");
  });

  it("dueToday=1, overdue=1, total=60000 -> Hoy: 1 por cobrar y 1 atrasado — total S/600.00.", () => {
    expect(buildDailyBriefMessage({ dueTodayCount: 1, overdueCount: 1, totalOwedCents: 60000 })).toBe("Hoy: 1 por cobrar y 1 atrasado — total S/600.00.");
  });
});
