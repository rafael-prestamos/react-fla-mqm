import { describe, it, expect } from "vitest";
import { normalizeClientName, clientNameMatches } from "./clientName";

describe("clientName", () => {
  it("normalizeClientName capitalizes and trims", () => {
    expect(normalizeClientName("juan pérez")).toBe("JUAN PÉREZ");
    expect(normalizeClientName("  maría   lópez  ")).toBe("MARÍA LÓPEZ");
    expect(normalizeClientName("")).toBe("");
  });

  it("clientNameMatches matches case and accent insensitive", () => {
    expect(clientNameMatches("JUAN PÉREZ", "juan")).toBe(true);
    expect(clientNameMatches("MARÍA LÓPEZ", "maria")).toBe(true);
    expect(clientNameMatches("PEDRO", "carlos")).toBe(false);
  });
});
