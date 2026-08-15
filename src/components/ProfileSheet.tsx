// Patrón: Modal/Sheet + Presentational component.
// Consolida acciones de usuario dispersas (Ajustes + cierre de sesión + información).
// Sprint 6a-6
import { LogOut, Settings, User, X } from "lucide-react";
import { BUSINESS_NAME } from "../config/business";
import { APP_VERSION } from "../config/version";
import { useSession } from "../auth/SessionContext";
import { useSync } from "../sync/SyncEngine";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

function formatRelativeTime(dateValue: string): string {
  const minutes = Math.round((new Date(dateValue).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  return formatter.format(Math.round(minutes / 60), "hour");
}

export function confirmSignOut(confirmAction: (message: string) => boolean, signOut: () => Promise<void>): void {
  if (confirmAction("¿Seguro que deseas cerrar sesión?")) {
    void signOut();
  }
}

export function ProfileSheet({ open, onClose, onOpenSettings }: ProfileSheetProps) {
  const { signOut } = useSession();
  const sync = useSync();

  if (!open) return null;

  const isOnline = sync.status !== "offline";

  return (
    <div className="ovl" onClick={onClose} role="presentation">
      <section className="sheet profile-sheet" onClick={(event) => event.stopPropagation()} aria-labelledby="profile-title">
        <header className="profile-sheet__header">
          <User size={44} aria-hidden="true" />
          <div>
            <h2 id="profile-title">{BUSINESS_NAME}</h2>
            <small>Versión {APP_VERSION}</small>
          </div>
          <button type="button" className="x" onClick={onClose} aria-label="Cerrar perfil"><X size={17} /></button>
        </header>

        <section className="profile-sheet__sync" aria-label="Estado de sincronización">
          <span className={`profile-sheet__status ${isOnline ? "online" : "offline"}`}>
            {isOnline ? "En línea" : "Sin conexión"}
          </span>
          {sync.lastSyncAt && <small>Última sincronización: {formatRelativeTime(sync.lastSyncAt)}</small>}
        </section>

        <div className="profile-sheet__actions">
          <button type="button" className="btn profile-sheet__action" onClick={onOpenSettings}>
            <Settings size={18} /> Ajustes
          </button>
          <button type="button" className="btn profile-sheet__action profile-sheet__logout" onClick={() => confirmSignOut(window.confirm, signOut)}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}
