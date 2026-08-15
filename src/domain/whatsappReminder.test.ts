import { describe, it, expect } from "vitest";
import { normalizePeruPhone, buildReminderMessage, buildWhatsappUrl, type ReminderInput } from "./whatsappReminder";
import type { Client, Loan, BusinessSettings } from "../types/domain";
import { format } from "date-fns";
import { es } from "date-fns/locale";

describe("whatsappReminder domain logic", () => {
  const mockClient: Client = {
    id: "c1",
    dni: "12345678",
    name: "Juan Pérez",
    phone: "961655740",
    rating: "good",
    maxDaysLateHistorical: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockLoan: Loan = {
    id: "l1",
    clientId: "c1",
    principalCents: 100000,
    rate: 0.2,
    termDays: 25,
    disbursedAt: new Date().toISOString(),
    paidOffCents: 0,
    renewalCount: 0,
    isPaid: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSettings: BusinessSettings = {
    id: "singleton",
    businessName: "Fla MpM",
    phone: "987654321",
    yape: "987654321",
    bcpSoles: "193-1234567-0-12",
    bcpInterbank: "002193123456701234",
    updatedAt: new Date().toISOString(),
  };

  describe("normalizePeruPhone", () => {
    it("prepends 51 to 9-digit numbers starting with 9", () => {
      expect(normalizePeruPhone("961655740")).toBe("51961655740");
    });

    it("leaves numbers starting with 51 as is", () => {
      expect(normalizePeruPhone("51961655740")).toBe("51961655740");
    });

    it("removes spaces, dashes, parentheses and +", () => {
      expect(normalizePeruPhone("+51 961 655 740")).toBe("51961655740");
      expect(normalizePeruPhone("(961) 655-740")).toBe("51961655740");
    });

    it("leaves unknown numbers without prefix but cleans them", () => {
      expect(normalizePeruPhone("abc123")).toBe("123");
    });

    it("handles empty strings", () => {
      expect(normalizePeruPhone("")).toBe("");
    });
  });

  describe("buildReminderMessage", () => {
    const defaultInput: ReminderInput = {
      client: mockClient,
      loan: mockLoan,
      settings: mockSettings,
      balanceCents: 120000, // 1200.00
      dueDate: new Date(2023, 10, 25), // Nov 25, 2023
      reference: new Date(2023, 10, 22), // Nov 22, 2023 (daysToDue = 3)
    };

    it("generates standard reminder when daysToDue > 1", () => {
      const msg = buildReminderMessage(defaultInput);
      expect(msg).toContain("Hola Juan Pérez,");
      expect(msg).toContain("te recuerdo que tu préstamo vence el 25 de noviembre de 2023.");
      expect(msg).toContain("Debes pagar 1,200.00.");
      expect(msg).toContain("Puedes pagar por:");
      expect(msg).toContain("• Yape/Plin: 987654321");
      expect(msg).toContain("• BCP Soles: 193-1234567-0-12");
      expect(msg).toContain("• CCI interbancaria: 002193123456701234");
      expect(msg).toContain("Cualquier duda me escribes. Gracias.");
    });

    it("generates urgent reminder when daysToDue === 1 (tomorrow)", () => {
      const msg = buildReminderMessage({ ...defaultInput, reference: new Date(2023, 10, 24) });
      expect(msg).toContain("te recuerdo que MAÑANA vence tu préstamo.");
      expect(msg).toContain("Debes pagar 1,200.00.");
    });

    it("generates critical reminder when daysToDue === 0 (today)", () => {
      const msg = buildReminderMessage({ ...defaultInput, reference: new Date(2023, 10, 25) });
      expect(msg).toContain("te recuerdo que HOY vence tu préstamo.");
      expect(msg).toContain("Debes pagar 1,200.00.");
    });

    it("generates late reminder when daysToDue < 0 (late)", () => {
      const msg = buildReminderMessage({ ...defaultInput, reference: new Date(2023, 10, 30) }); // 5 days late
      expect(msg).toContain("tu préstamo venció el 25 de noviembre de 2023 (5 días de atraso).");
      expect(msg).toContain("Debes pagar 1,200.00.");
    });

    it("generates late reminder with singular day when daysToDue === -1", () => {
      const msg = buildReminderMessage({ ...defaultInput, reference: new Date(2023, 10, 26) }); // 1 day late
      expect(msg).toContain("tu préstamo venció el 25 de noviembre de 2023 (1 día de atraso).");
    });

    it("omits yape line if settings.yape is empty but includes BCP and CCI", () => {
      const msg = buildReminderMessage({
        ...defaultInput,
        settings: { ...mockSettings, yape: "" },
      });
      expect(msg).toContain("Puedes pagar por:");
      expect(msg).not.toContain("Yape/Plin");
      expect(msg).toContain("• BCP Soles: 193-1234567-0-12");
      expect(msg).toContain("• CCI interbancaria: 002193123456701234");
    });

    it("omits payment options block if all accounts are empty", () => {
      const msg = buildReminderMessage({
        ...defaultInput,
        settings: { ...mockSettings, yape: "", bcpSoles: "", bcpInterbank: "" },
      });
      expect(msg).not.toContain("Puedes pagar por:");
      expect(msg).not.toContain("Yape");
      expect(msg).not.toContain("BCP");
      expect(msg).not.toContain("CCI");
      expect(msg).toContain("Debes pagar 1,200.00.");
      expect(msg).toContain("Cualquier duda me escribes.");
    });
  });

  describe("buildWhatsappUrl", () => {
    const defaultInput: ReminderInput = {
      client: mockClient,
      loan: mockLoan,
      settings: mockSettings,
      balanceCents: 120000,
      dueDate: new Date(2023, 10, 25),
      reference: new Date(2023, 10, 22),
    };

    it("constructs full wa.me URL with normalized phone and encoded text", () => {
      const url = buildWhatsappUrl(defaultInput);
      expect(url).to.match(/^https:\/\/wa\.me\/51961655740\?text=/);
      expect(url).toContain(encodeURIComponent("Hola Juan Pérez,"));
    });
  });
});
