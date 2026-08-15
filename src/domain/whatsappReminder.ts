import type { Client, Loan, BusinessSettings } from "../types/domain";
import { diffDays } from "../lib/dates";

export interface ReminderInput {
  client: Client;
  loan: Loan;
  settings: BusinessSettings;
  balanceCents: number;
  dueDate: Date;
  reference?: Date;
}

export function normalizePeruPhone(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[\s\-\(\)\+]/g, "");
  
  if (cleaned.startsWith("51")) {
    return cleaned;
  }
  
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return `51${cleaned}`;
  }
  
  return cleaned.replace(/\D/g, ""); // return just digits if unknown format
}

function formatSoles(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildReminderMessage(input: ReminderInput): string {
  const { client, settings, balanceCents, dueDate, reference = new Date() } = input;
  
  const daysToDue = diffDays(dueDate, reference);
  const formattedDate = dueDate.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const formattedAmount = formatSoles(balanceCents);

  let body = "";
  if (daysToDue > 1) {
    body = `te recuerdo que tu préstamo vence el ${formattedDate}.`;
  } else if (daysToDue === 1) {
    body = "te recuerdo que MAÑANA vence tu préstamo.";
  } else if (daysToDue === 0) {
    body = "te recuerdo que HOY vence tu préstamo.";
  } else {
    const daysLate = -daysToDue;
    const dayStr = daysLate === 1 ? "día" : "días";
    body = `tu préstamo venció el ${formattedDate} (${daysLate} ${dayStr} de atraso).`;
  }

  const parts = [
    `Hola ${client.name},`,
    `${body}\nDebes pagar ${formattedAmount}.`,
  ];

  const hasYape = !!settings.yape?.trim();
  const hasBcp = !!settings.bcpSoles?.trim();
  const hasCci = !!settings.bcpInterbank?.trim();

  if (hasYape || hasBcp || hasCci) {
    const paymentLines = ["Puedes pagar por:"];
    if (hasYape) paymentLines.push(`• Yape/Plin: ${settings.yape}`);
    if (hasBcp) paymentLines.push(`• BCP Soles: ${settings.bcpSoles}`);
    if (hasCci) paymentLines.push(`• CCI interbancaria: ${settings.bcpInterbank}`);
    parts.push(paymentLines.join("\n"));
  }

  parts.push("Cualquier duda me escribes. Gracias.");

  return parts.join("\n\n");
}

export function buildWhatsappUrl(input: ReminderInput): string {
  const phone = normalizePeruPhone(input.client.phone);
  const text = encodeURIComponent(buildReminderMessage(input));
  return `https://wa.me/${phone}?text=${text}`;
}
