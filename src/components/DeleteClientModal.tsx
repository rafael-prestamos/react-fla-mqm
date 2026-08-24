import { useState } from "react";
import type { Client } from "../types/domain";

interface Props { client: Client; onClose: () => void; onConfirm: () => Promise<void>; }
export function DeleteClientModal({ client, onClose, onConfirm }: Props) {
  const [saving, setSaving] = useState(false);
  async function handleConfirm() { setSaving(true); try { await onConfirm(); onClose(); } finally { setSaving(false); } }
  return <div className="ovl" onClick={onClose}><div className="cancel-modal" onClick={(event) => event.stopPropagation()}>
    <h4>¿Eliminar cliente?</h4>
    <div>¿Eliminar a {client.name} por completo? Esta acción no se puede deshacer.</div>
    <div className="cancel-actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-danger" disabled={saving} onClick={() => void handleConfirm()}>Eliminar</button></div>
  </div></div>;
}
