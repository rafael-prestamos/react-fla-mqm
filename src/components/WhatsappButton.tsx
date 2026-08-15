import { MessageCircle } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import type { Client, Loan } from "../types/domain";
import { buildWhatsappUrl } from "../domain/whatsappReminder";

interface Props {
  client: Client;
  loan: Loan;
  balanceCents: number;
  dueDate: Date;
}

export function WhatsappButton({ client, loan, balanceCents, dueDate }: Props) {
  const settings = useLiveQuery(() => db.settings.get("singleton"));

  const hasPhone = !!client.phone?.trim();
  const disabled = !settings || !hasPhone;

  const handleClick = () => {
    if (!settings) return;
    const url = buildWhatsappUrl({
      client,
      loan,
      settings,
      balanceCents,
      dueDate,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={!hasPhone ? "Sin celular" : "Enviar recordatorio por WhatsApp"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        backgroundColor: disabled ? "var(--muted)" : "#25D366",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <MessageCircle size={14} />
      WhatsApp
    </button>
  );
}
