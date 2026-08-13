import { describe, it, expect } from "vitest";
import { validateClientInput } from "./clientValidation";

describe("clientValidation", () => {
  it("validates a correct client", () => {
    const res = validateClientInput({ name: "Ana Torres", dni: "12345678", phone: "987654321" });
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual({});
  });

  it("validates empty name", () => {
    const res = validateClientInput({ name: "", dni: "12345678", phone: "987654321" });
    expect(res.ok).toBe(false);
    expect(res.errors.name).toBe("Ingresa el nombre");
  });

  it("validates invalid dni", () => {
    let res = validateClientInput({ name: "Ana", dni: "123", phone: "987654321" });
    expect(res.ok).toBe(false);
    expect(res.errors.dni).toBe("El DNI debe tener 8 dígitos");

    res = validateClientInput({ name: "Ana", dni: "1234567a", phone: "987654321" });
    expect(res.errors.dni).toBeDefined();
  });

  it("validates invalid phone", () => {
    let res = validateClientInput({ name: "Ana", dni: "12345678", phone: "12345678" });
    expect(res.ok).toBe(false);
    expect(res.errors.phone).toBe("El celular debe tener 9 dígitos y empezar con 9");

    res = validateClientInput({ name: "Ana", dni: "12345678", phone: "887654321" });
    expect(res.errors.phone).toBeDefined();
  });

  it("trims spaces before validating", () => {
    const res = validateClientInput({ name: "  Ana ", dni: " 12345678 ", phone: " 987654321 " });
    expect(res.ok).toBe(true);
  });
});
