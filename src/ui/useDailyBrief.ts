import { useEffect, useRef } from "react";
import type { Loan, Client } from "../types/domain";
import { useToast } from "./ToastContext";
import { isFirstOpenOfDay, markOpenedToday } from "./lastOpenedTracker";
import { buildDailyBriefMessage } from "../domain/dailyBrief";
import { deriveLoan } from "../domain/loanRules";
import { startOfToday } from "../lib/dates";

export function useDailyBrief(params: {
  loans: Loan[] | undefined;
  clients: Client[] | undefined;
}): void {
  const { loans, clients } = params;
  const toast = useToast();
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!loans || !clients) return;
    if (hasFiredRef.current) return;

    // Only process once we have data
    if (isFirstOpenOfDay()) {
      const today = startOfToday();
      let dueTodayCount = 0;
      let overdueCount = 0;
      let totalOwedCents = 0;

      for (const loan of loans) {
        if (!loan.isPaid) {
          const derived = deriveLoan(loan, today);
          if (derived.daysLate === 0) {
            dueTodayCount++;
            totalOwedCents += derived.balanceCents;
          } else if (derived.daysLate > 0) {
            overdueCount++;
            totalOwedCents += derived.balanceCents;
          }
        }
      }

      const msg = buildDailyBriefMessage({
        dueTodayCount,
        overdueCount,
        totalOwedCents
      });

      if (msg) {
        toast.info("🔔 " + msg);
      }

      // Mark as opened regardless of if there was a msg, so we don't calculate on next reload today
      markOpenedToday();
      hasFiredRef.current = true;
    }
  }, [loans, clients, toast]);
}
