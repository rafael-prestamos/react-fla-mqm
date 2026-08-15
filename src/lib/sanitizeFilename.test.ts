import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "./sanitizeFilename";

describe("sanitizeFilename", () => {
  it("removes accents and lowercases", () => {
    expect(sanitizeFilename("María José Núñez")).toBe("maria-jose-nunez");
  });

  it("collapses spaces and symbols into single hyphens", () => {
    expect(sanitizeFilename("Ana  Torres (VIP)!!")).toBe("ana-torres-vip");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeFilename("  Juan Pérez  ")).toBe("juan-perez");
  });
});
