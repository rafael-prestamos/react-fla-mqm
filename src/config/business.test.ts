import { describe, it, expect } from "vitest";
import { makeDefaultSettings, DEFAULT_BUSINESS } from "./business";

describe("makeDefaultSettings", () => {
  it("returns all default business fields", () => {
    const settings = makeDefaultSettings();
    expect(settings.id).toBe("singleton");
    expect(settings.businessName).toBe(DEFAULT_BUSINESS.businessName);
    expect(settings.phone).toBe(DEFAULT_BUSINESS.phone);
    expect(settings.yape).toBe(DEFAULT_BUSINESS.yape);
    expect(settings.bcpSoles).toBe(DEFAULT_BUSINESS.bcpSoles);
    expect(settings.bcpInterbank).toBe(DEFAULT_BUSINESS.bcpInterbank);
  });

  it("returns a valid ISO updatedAt timestamp", () => {
    const settings = makeDefaultSettings();
    expect(settings.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(settings.updatedAt).toString()).not.toBe("Invalid Date");
  });
});
