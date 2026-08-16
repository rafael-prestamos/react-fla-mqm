// Sprint 5b-2: Notificación push diaria (7am hora Perú) con el resumen de cobros pendientes.
// Deno Edge Function — invocada por pg_cron. Sin dependencias del frontend: la lógica de
// mensaje está duplicada a propósito porque no hay forma de compartir código entre
// src/domain (Vite/browser) y este runtime (Deno).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface LoanRow {
  id: string;
  owner_id: string;
  principal_cents: number;
  rate: number;
  term_days: number;
  disbursed_at: string;
  paid_off_cents: number;
  is_paid: boolean;
  cancelled_at: string | null;
}

interface PushSub {
  owner_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Fecha de hoy (solo día) en zona horaria Perú (UTC-5 fijo, sin horario de verano). */
function getPeruToday(): string {
  const now = new Date();
  const peruOffsetMinutes = -5 * 60;
  const peruTime = new Date(now.getTime() + (peruOffsetMinutes + now.getTimezoneOffset()) * 60000);
  return peruTime.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Réplica de deriveLoan (src/domain/loanRules.ts) para Deno — mismas reglas: tolerancia 7 días, 1 período extra por cada 30 días de atraso. */
function computeBalance(loan: LoanRow, today: string): { balanceCents: number; dueDate: string; daysLate: number } {
  const dueDate = addDays(loan.disbursed_at, loan.term_days);
  const daysLate = Math.max(0, Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / 86_400_000));
  const interestCents = Math.round(loan.principal_cents * loan.rate);
  const totalCents = loan.principal_cents + interestCents;

  const latePeriods = daysLate > 7 ? 1 + Math.floor((daysLate - 8) / 30) : 0;
  const lateInterestCents = latePeriods * interestCents;

  const debtCents = totalCents + lateInterestCents;
  const balanceCents = Math.max(0, debtCents - loan.paid_off_cents);
  return { balanceCents, dueDate, daysLate };
}

function formatSoles(cents: number): string {
  return "S/" + (cents / 100).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Réplica de buildDailyBriefMessage (src/domain/dailyBrief.ts) adaptada al formato push. */
function buildPushBody(dueTodayCount: number, overdueCount: number, totalOwedCents: number): string {
  const amountStr = formatSoles(totalOwedCents);

  if (dueTodayCount > 0 && overdueCount === 0) {
    return dueTodayCount === 1 ? `Hoy vence 1 préstamo por ${amountStr}.` : `Hoy vencen ${dueTodayCount} préstamos por ${amountStr}.`;
  }
  if (dueTodayCount === 0 && overdueCount > 0) {
    return overdueCount === 1 ? `Tienes 1 préstamo atrasado por ${amountStr}.` : `Tienes ${overdueCount} préstamos atrasados por ${amountStr}.`;
  }
  const overdueNoun = overdueCount === 1 ? "atrasado" : "atrasados";
  return `Hoy: ${dueTodayCount} por cobrar y ${overdueCount} ${overdueNoun} — total ${amountStr}.`;
}

async function sendPush(admin: ReturnType<typeof createClient>, sub: PushSub, payload: { title: string; body: string }): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    console.error("Push failed for", sub.endpoint.slice(0, 50), err);
    const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined;
    if (statusCode === 410) {
      // Suscripción vencida/revocada por el browser: ya no sirve, se elimina.
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      console.log("Removed expired subscription:", sub.endpoint.slice(0, 50));
    }
    return false;
  }
}

serve(async (_req) => {
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = getPeruToday();

    const { data: subs, error: subsErr } = await admin
      .from("push_subscriptions")
      .select("owner_id, endpoint, p256dh, auth");

    if (subsErr || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), { status: 200 });
    }

    const ownerIds = [...new Set((subs as PushSub[]).map((s) => s.owner_id))];
    let totalSent = 0;

    for (const ownerId of ownerIds) {
      const { data: loans } = await admin
        .from("loans")
        .select("id, owner_id, principal_cents, rate, term_days, disbursed_at, paid_off_cents, is_paid, cancelled_at")
        .eq("owner_id", ownerId)
        .eq("is_paid", false)
        .is("cancelled_at", null);

      if (!loans || loans.length === 0) continue;

      let dueTodayCount = 0;
      let overdueCount = 0;
      let totalOwedCents = 0;

      for (const loan of loans as LoanRow[]) {
        const { balanceCents, dueDate, daysLate } = computeBalance(loan, today);
        totalOwedCents += balanceCents;
        if (dueDate === today) dueTodayCount++;
        else if (daysLate > 0) overdueCount++;
      }

      // Solo notificar si hay algo que vence hoy o está atrasado — no molestar por préstamos al día.
      if (dueTodayCount === 0 && overdueCount === 0) continue;

      const payload = {
        title: "Fla MpM — Cobros del día",
        body: buildPushBody(dueTodayCount, overdueCount, totalOwedCents),
      };

      const ownerSubs = (subs as PushSub[]).filter((s) => s.owner_id === ownerId);
      for (const sub of ownerSubs) {
        if (await sendPush(admin, sub, payload)) totalSent++;
      }
    }

    return new Response(JSON.stringify({ sent: totalSent, date: today }), { status: 200 });
  } catch (err) {
    console.error("daily-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
