import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/database";
import { loansRepo } from "./loansRepo";
import { installmentsRepo } from "./installmentsRepo";
import { paymentsRepo } from "./paymentsRepo";
import type { InstallmentFrequency } from "../types/domain";

describe("Repositories (Cuotas)", () => {
  beforeEach(async () => {
    if (db.isOpen()) {
      db.close();
    }
    await db.delete();
    await db.open();
  });

  describe("loansRepo & installmentsRepo", () => {
    it("creates a loan and its installments", async () => {
      const { loan, installments } = await loansRepo.create({
        clientId: "client-1",
        principalCents: 100000,
        rate: 0.1,
        installmentCount: 2,
        frequency: "monthly" as InstallmentFrequency,
        disbursedAt: "2024-01-01"
      });

      expect(loan.id).toBeDefined();
      expect(installments.length).toBe(2);

      const dbLoans = await loansRepo.all();
      expect(dbLoans.length).toBe(1);
      expect(dbLoans[0].principalCents).toBe(100000);

      const dbInstallments = await installmentsRepo.byLoan(loan.id);
      expect(dbInstallments.length).toBe(2);

      const outboxEntries = await db.outbox.toArray();
      expect(outboxEntries.length).toBe(3); // 1 loan + 2 installments
    });

    it("applies a payment and updates outbox", async () => {
      const { installments } = await loansRepo.create({
        clientId: "client-1",
        principalCents: 10000,
        rate: 0.1,
        installmentCount: 1,
        frequency: "weekly" as InstallmentFrequency,
        disbursedAt: "2024-01-01"
      });

      const { payment, installment } = await installmentsRepo.applyPayment(
        installments[0].id,
        5000,
        "cash"
      );

      expect(payment.amountCents).toBe(5000);
      expect(installment.paidCents).toBe(5000);
      expect(installment.status).toBe("pending");

      const dbPayments = await paymentsRepo.all();
      expect(dbPayments.length).toBe(1);

      // 3 creation outbox items + 2 update outbox items (installment + payment)
      const outboxEntries = await db.outbox.toArray();
      expect(outboxEntries.length).toBe(4);
    });

    it("marks loan as paid if all installments paid", async () => {
      const { installments } = await loansRepo.create({
        clientId: "client-1",
        principalCents: 10000,
        rate: 0.1,
        installmentCount: 1,
        frequency: "weekly" as InstallmentFrequency,
        disbursedAt: "2024-01-01"
      });

      await installmentsRepo.applyPayment(installments[0].id, 11000, "cash");

      const dbLoan = (await loansRepo.all())[0];
      expect(dbLoan.isPaid).toBe(true);
    });
  });

  describe("loanBackfill", () => {
    it("creates loan, installments, and synthetic payments", async () => {
      const { loan, installments, payments } = await loansRepo.backfill({
        clientId: "c1",
        principalCents: 20000,
        rate: 0.1,
        installmentCount: 2,
        frequency: "monthly" as InstallmentFrequency,
        disbursedAt: "2024-01-01",
        installments: [
          { index: 1, paidCents: 11000, paidAt: "2024-01-31" }
        ]
      });

      expect(loan.id).toBeDefined();
      expect(installments.length).toBe(2);
      expect(payments.length).toBe(1);
      expect(installments[0].status).toBe("paid");

      const dbLoans = await loansRepo.all();
      expect(dbLoans.length).toBe(1);

      const dbInstallments = await installmentsRepo.byLoan(loan.id);
      expect(dbInstallments.length).toBe(2);

      const dbPayments = await paymentsRepo.byLoan(loan.id);
      expect(dbPayments.length).toBe(1);

      const outboxEntries = await db.outbox.toArray();
      expect(outboxEntries.length).toBe(4); // 1 loan + 2 inst + 1 payment
    });
  });
});
