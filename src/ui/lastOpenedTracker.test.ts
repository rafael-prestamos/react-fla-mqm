import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getLastOpenedDate, markOpenedToday, isFirstOpenOfDay } from "./lastOpenedTracker";

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

describe("lastOpenedTracker", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", mockLocalStorage);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("without previous localStorage -> getLastOpenedDate === null; isFirstOpenOfDay === true", () => {
    expect(getLastOpenedDate()).toBeNull();
    expect(isFirstOpenOfDay()).toBe(true);
  });

  it("after markOpenedToday -> gets that date, isFirstOpenOfDay returns false for same day and true for next day", () => {
    const d = new Date(2026, 7, 14); // 2026-08-14
    markOpenedToday(d);
    
    expect(getLastOpenedDate()).toBe("2026-08-14");
    expect(isFirstOpenOfDay(d)).toBe(false);
    
    const nextDay = new Date(2026, 7, 15);
    expect(isFirstOpenOfDay(nextDay)).toBe(true);
  });

  it("markOpenedToday updates without breaking on multiple calls", () => {
    const d = new Date(2026, 7, 14);
    markOpenedToday(d);
    markOpenedToday(d);
    
    expect(getLastOpenedDate()).toBe("2026-08-14");
    expect(isFirstOpenOfDay(d)).toBe(false);
  });
});
