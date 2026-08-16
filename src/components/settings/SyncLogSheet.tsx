// Patrón: Bottom sheet + Presentational component, mismo estilo visual de Ajustes.
// Muestra los registros del outbox con errores (reintentando o dead-letter) — sprint sync-log.
import { useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type OutboxOp, type SyncEntity } from "../../db/database";
import { retryDeadLetter, retryAllDeadLetters } from "../../sync/outbox";
import { useSync } from "../../sync/SyncEngine";
import { useToast } from "../../ui/ToastContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ENTITY_LABEL: Record<SyncEntity, string> = {
  clients: "Clientes",
  loans: "Préstamos",
  payments: "Pagos",
  settings: "Ajustes",
};

const OP_LABEL: Record<OutboxOp["op"], string> = {
  put: "Guardar",
  delete: "Eliminar",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SyncLogSheet({ open, onClose }: Props) {
  const toast = useToast();
  const { forcePush } = useSync();
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);

  const entries = useLiveQuery(async () => {
    const all = await db.outbox.filter((entry) => (entry.retryCount ?? 0) > 0 || !!entry.failedAt).toArray();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);

  const deadLetterCount = entries?.filter((entry) => !!entry.failedAt).length ?? 0;

  async function handleRetry(id: number | undefined) {
    if (id === undefined) return;
    setRetryingId(id);
    try {
      await retryDeadLetter(id);
      await forcePush();
      toast.success("Reintentando...");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleRetryAll() {
    setRetryingAll(true);
    try {
      await retryAllDeadLetters();
      await forcePush();
      toast.success("Reintentando todos los cambios...");
    } finally {
      setRetryingAll(false);
    }
  }

  if (!open) return null;

  return (
    <div className="ovl" onClick={onClose}>
      <div
        className="sheet"
        style={{ height: "90vh", display: "flex", flexDirection: "column", padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px",
            background: "linear-gradient(160deg,var(--navy-light),var(--navy-deep))",
            color: "var(--cream)",
            borderRadius: "20px 20px 0 0",
          }}
        >
          <span className="x" onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "var(--cream)" }}>
            <ArrowLeft size={17} />
          </span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Log de sincronización</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {!entries?.length && (
            <div className="empty">No hay errores de sincronización.</div>
          )}

          {!!entries?.length && entries.map((entry) => (
            <div
              key={entry.id}
              className="row"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {ENTITY_LABEL[entry.entity]} · {OP_LABEL[entry.op]}
                </span>
                {entry.failedAt && (
                  <span
                    style={{
                      background: "var(--color-status-bad)",
                      color: "#fff",
                      borderRadius: 20,
                      fontSize: 11,
                      padding: "2px 8px",
                      fontWeight: 600,
                    }}
                  >
                    Descartado
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                ID: {entry.entityId.slice(0, 8)} · {entry.retryCount ?? 0} intento{(entry.retryCount ?? 0) === 1 ? "" : "s"}
                {entry.failedAt && ` · descartado ${formatDateTime(entry.failedAt)}`}
              </div>
              {entry.lastError && (
                <div style={{ fontSize: 12, color: "var(--color-status-bad)", wordBreak: "break-word" }}>
                  {entry.lastError}
                </div>
              )}
              {entry.failedAt && (
                <button
                  type="button"
                  className="btn btn-p"
                  disabled={retryingId === entry.id || retryingAll}
                  onClick={() => void handleRetry(entry.id)}
                  style={{ alignSelf: "flex-start", marginTop: 4 }}
                >
                  <RotateCcw size={14} /> {retryingId === entry.id ? "Reintentando…" : "Reintentar"}
                </button>
              )}
            </div>
          ))}
        </div>

        {deadLetterCount > 0 && (
          <div style={{ flexShrink: 0, padding: 16, borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              className="btn btn-p btn-block"
              disabled={retryingAll}
              onClick={() => void handleRetryAll()}
            >
              {retryingAll ? "Reintentando…" : `Reintentar todos (${deadLetterCount})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
