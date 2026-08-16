import { useState } from "react";
import { Bell } from "lucide-react";
import { subscribeToPush } from "../push/pushSubscription";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

/** Modal de opt-in para notificaciones push diarias (Sprint 5b-2). Se muestra una vez al primer login. */
export function PushPermissionModal({ onClose, onSuccess }: Props) {
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setSubscribing(true);
    setError(null);
    try {
      const ok = await subscribeToPush();
      if (ok) {
        onSuccess();
      } else {
        setError("No se pudo activar. Verifica que aceptaste el permiso.");
      }
    } catch {
      setError("Error al activar notificaciones.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div className="cancel-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <Bell size={40} style={{ color: "var(--navy)", marginBottom: 12 }} />
        <h4>Resumen diario de cobros</h4>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "10px 0 18px", lineHeight: 1.5 }}>
          Recibe cada mañana a las 7am una notificación con tus cobros pendientes del día.
        </p>
        {error && <div style={{ color: "var(--bad)", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-p btn-block" disabled={subscribing} onClick={() => void handleActivate()}>
          {subscribing ? "Activando…" : "Activar notificaciones"}
        </button>
        <button
          className="btn btn-block"
          onClick={onClose}
          style={{ marginTop: 8, background: "transparent", color: "var(--muted)" }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
