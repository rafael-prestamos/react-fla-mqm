import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import type { BusinessSettings } from "../types/domain";
import { db } from "../db/database";
import { settingsRepo } from "../repositories/settingsRepo";
import { useToast } from "../ui/ToastContext";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";
import { isPushSubscribed, subscribeToPush } from "../push/pushSubscription";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSyncLog: () => void;
}

type EditableFields = Pick<BusinessSettings, "businessName" | "phone" | "yape" | "yapeHolder" | "bcpSoles" | "bcpSolesHolder" | "bcpInterbank" | "bcpInterbankHolder">;

const HELPER_TEXT = "Este dato aparece en los comprobantes que compartes con tus clientes.";

export function SettingsSheet({ open, onClose, onOpenSyncLog }: Props) {
  const formRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(formRef);
  const toast = useToast();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [initial, setInitial] = useState<EditableFields | null>(null);
  const [form, setForm] = useState<EditableFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);
  const syncErrorCount = useLiveQuery(
    () => db.outbox.filter((entry) => (entry.retryCount ?? 0) > 0 || !!entry.failedAt).count()
  ) ?? 0;

  useEffect(() => {
    void isPushSubscribed().then(setPushEnabled);
  }, []);

  async function handleTogglePush() {
    if (pushEnabled) return; // desactivar requiere ir a la config de notificaciones del navegador
    setTogglingPush(true);
    const ok = await subscribeToPush();
    setPushEnabled(ok);
    setTogglingPush(false);
  }

  async function load() {
    setStatus("loading");
    try {
      const settings = await settingsRepo.get();
      if (!settings) {
        setStatus("error");
        return;
      }
      const fields: EditableFields = {
        businessName: settings.businessName,
        phone: settings.phone,
        yape: settings.yape,
        bcpSoles: settings.bcpSoles,
        bcpInterbank: settings.bcpInterbank,
        yapeHolder: settings.yapeHolder,
        bcpSolesHolder: settings.bcpSolesHolder,
        bcpInterbankHolder: settings.bcpInterbankHolder,
      };
      setInitial(fields);
      setForm(fields);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const hasChanges = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial);

  function setField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!form || !hasChanges) return;
    setSaving(true);
    try {
      await settingsRepo.update(form);
      toast.success("Ajustes guardados");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar los ajustes");
    } finally {
      setSaving(false);
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
          <span style={{ fontSize: 17, fontWeight: 700 }}>Ajustes</span>
        </div>

        <div ref={formRef} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {status === "loading" && (
            <div className="empty">Cargando…</div>
          )}

          {status === "error" && (
            <div className="empty" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              No se pudieron cargar los ajustes.
              <button className="btn btn-p" onClick={() => void load()}>Reintentar</button>
            </div>
          )}

          {status === "ready" && form && (
            <>
              <div className="pf-sect">Datos del negocio</div>
              <div className="field">
                <label>Nombre</label>
                <input
                  className="inp"
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  placeholder="Ej. Fla"
                />
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>{HELPER_TEXT}</div>
              </div>
              <div className="field">
                <label>Celular</label>
                <input
                  type="tel"
                  className="inp"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="961655740"
                />
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>{HELPER_TEXT}</div>
              </div>

              <div className="pf-sect">Cuentas para cobrar</div>
              
              <div style={{ paddingBottom: "16px", borderBottom: "1px dashed var(--line)", marginBottom: "16px" }}>
                <div className="field">
                  <label>Yape / Plin</label>
                  <input
                    className="inp"
                    value={form.yape}
                    onChange={(e) => setField("yape", e.target.value)}
                    placeholder="961655740"
                  />
                </div>
                <div className="field">
                  <label>A nombre de</label>
                  <input
                    className="inp"
                    value={form.yapeHolder}
                    onChange={(e) => setField("yapeHolder", e.target.value)}
                    placeholder="Rafael Rojas"
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{HELPER_TEXT}</div>
              </div>

              <div style={{ paddingBottom: "16px", borderBottom: "1px dashed var(--line)", marginBottom: "16px" }}>
                <div className="field">
                  <label>Cuenta BCP Soles</label>
                  <input
                    className="inp"
                    value={form.bcpSoles}
                    onChange={(e) => setField("bcpSoles", e.target.value)}
                    placeholder="48018243654096"
                  />
                </div>
                <div className="field">
                  <label>A nombre de</label>
                  <input
                    className="inp"
                    value={form.bcpSolesHolder}
                    onChange={(e) => setField("bcpSolesHolder", e.target.value)}
                    placeholder="Rafael Rojas"
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{HELPER_TEXT}</div>
              </div>

              <div style={{ paddingBottom: "16px", marginBottom: "16px" }}>
                <div className="field">
                  <label>CCI interbancaria BCP</label>
                  <input
                    className="inp"
                    value={form.bcpInterbank}
                    onChange={(e) => setField("bcpInterbank", e.target.value)}
                    placeholder="00248011824365409622"
                  />
                </div>
                <div className="field">
                  <label>A nombre de</label>
                  <input
                    className="inp"
                    value={form.bcpInterbankHolder}
                    onChange={(e) => setField("bcpInterbankHolder", e.target.value)}
                    placeholder="Rafael Rojas"
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{HELPER_TEXT}</div>
              </div>

              <div className="pf-sect">Notificaciones</div>
              <div className="field" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ flex: 1 }}>Notificaciones diarias (7am)</label>
                <button
                  type="button"
                  className={`btn ${pushEnabled ? "btn-p" : ""}`}
                  disabled={pushEnabled || togglingPush}
                  onClick={() => void handleTogglePush()}
                  style={{ minWidth: 90 }}
                >
                  {togglingPush ? "Activando…" : pushEnabled ? "Activadas" : "Activar"}
                </button>
              </div>

              <div className="pf-sect">Sincronización</div>
              <button
                type="button"
                className="btn"
                disabled={syncErrorCount === 0}
                onClick={onOpenSyncLog}
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  padding: "12px",
                }}
              >
                <span>Log de sincronización</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {syncErrorCount > 0 ? (
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
                      {syncErrorCount}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Sin errores</span>
                  )}
                  <ChevronRight size={16} color="var(--muted)" />
                </span>
              </button>
            </>
          )}
        </div>

        {status === "ready" && (
          <div style={{ flexShrink: 0, padding: 16, borderTop: "1px solid var(--line)" }}>
            <button
              className="btn btn-p btn-block"
              disabled={!hasChanges || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
