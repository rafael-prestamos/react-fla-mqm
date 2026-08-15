import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { Client } from "../types/domain";
import { validateClientInput, type ClientErrors } from "../domain/clientValidation";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";

interface Props {
  client: Client;
  onClose: () => void;
  onSave: (patch: Pick<Client, "name" | "dni" | "phone">) => Promise<void>;
}

export function EditClientSheet({ client, onClose, onSave }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareInput(sheetRef);
  const [name, setName] = useState(client.name);
  const [dni, setDni] = useState(client.dni);
  const [phone, setPhone] = useState(client.phone);
  const [errors, setErrors] = useState<ClientErrors>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const validation = validateClientInput({ name, dni, phone });
    if (!validation.ok) return setErrors(validation.errors);
    setSaving(true);
    try {
      await onSave({ name, dni, phone });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return <div className="ovl" onClick={onClose}><div ref={sheetRef} className="sheet" onClick={(event) => event.stopPropagation()}>
    <h3>Editar cliente <span className="x" onClick={onClose}><X size={17} /></span></h3>
    <EditField label="Nombre" value={name} onChange={setName} error={errors.name} />
    <EditField label="DNI" value={dni} onChange={setDni} error={errors.dni} numeric />
    <EditField label="Celular" value={phone} onChange={setPhone} error={errors.phone} numeric />
    <button className="btn btn-p btn-block" style={{ marginTop: 18 }} disabled={saving} onClick={() => void handleSave()}>{saving ? "Guardando…" : "Guardar cambios"}</button>
  </div></div>;
}

function EditField({ label, value, onChange, error, numeric = false }: { label: string; value: string; onChange: (value: string) => void; error?: string; numeric?: boolean }) {
  return <div className="field"><label>{label}</label><input className="inp" inputMode={numeric ? "numeric" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />{error && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{error}</div>}</div>;
}
