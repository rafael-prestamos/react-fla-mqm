import { useEffect, useRef } from "react";
import type { Loan, Client } from "../types/domain";
import { deriveLoan } from "../domain/loanRules";
import { buildDailyBriefMessage } from "../domain/dailyBrief";
import { isFirstOpenOfDay, markOpenedToday } from "./lastOpenedTracker";
import { useToast } from "./ToastContext";

interface Params {
  loans: Loan[] | undefined;
  clients: Client[] | undefined;
}

/** Muestra un toast en la primera apertura del día si hay pendientes.
    Reglas:
    - Espera a que loans y clients estén cargados (arrays, no undefined).
    - Solo evalúa una vez por sesión (ref).
    - Si es primera apertura + hay pendientes → toast + marca día.
    - Si es primera apertura + NO hay pendientes → marca día (mañana intentará de nuevo).
    - Si NO es primera apertura → no hace nada (idempotente con re-mounts). */
export function useDailyBrief({ loans, clients }: Params): void {
  const toast = useToast();
  const evaluatedRef = useRef(false);

  useEffect(() => {
    // Guardas duras: datos aún no cargados → no evaluar todavía.
    if (loans === undefined || clients === undefined) return;
    if (evaluatedRef.current) return;

    // Segunda guarda: si NO es primera apertura, marcar como evaluado y salir.
    // (Cubre StrictMode double-invoke y refresh manual del mismo día.)
    if (!isFirstOpenOfDay()) {
      evaluatedRef.current = true;
      return;
    }

    // Datos cargados + primera apertura del día: computar y quizás disparar.
    const today = new Date();
    let dueTodayCount = 0;
    let overdueCount = 0;
    let totalOwedCents = 0;
    for (const loan of loans) {
      if (loan.isPaid) continue;
      const d = deriveLoan(loan, today);
      if (d.daysLate === 0) {
        dueTodayCount += 1;
        totalOwedCents += d.balanceCents;
      } else if (d.daysLate > 0) {
        overdueCount += 1;
        totalOwedCents += d.balanceCents;
      }
    }

    const message = buildDailyBriefMessage({ dueTodayCount, overdueCount, totalOwedCents });
    if (message) {
      toast.info("🔔 " + message);
    }
    // Siempre marcar (con o sin mensaje) para que "primera apertura del día" sea 1 disparo por día.
    markOpenedToday();
    evaluatedRef.current = true;
  }, [loans, clients, toast]);
}
