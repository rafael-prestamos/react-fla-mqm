import { useState } from "react";
import { X } from "lucide-react";
import { validateClientInput, type ClientInput, type ClientErrors } from "../domain/clientValidation";

export function NewClientSheet({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (input: ClientInput) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<ClientErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const input = { name, dni, phone };
    const validation = validateClientInput(input);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    const err = await onSubmit(input);
    setSubmitting(false);
    if (err) {
      setErrors({ dni: err });
    }
  }

  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo cliente <span className="x" onClick={onClose}><X size={17} /></span></h3>
        
        <div className="field">
          <label>Nombre</label>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana Torres" />
          {errors.name && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.name}</div>}
        </div>

        <div className="field">
          <label>DNI</label>
          <input className="inp num" inputMode="numeric" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value)} placeholder="8 dígitos" />
          {errors.dni && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.dni}</div>}
        </div>

        <div className="field">
          <label>Celular</label>
          <input className="inp num" inputMode="numeric" maxLength={9} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9 dígitos" />
          {errors.phone && <div style={{ color: "var(--bad)", fontSize: 11, marginTop: 4 }}>{errors.phone}</div>}
        </div>

        <button
          className="btn btn-p btn-block"
          style={{ marginTop: 18 }}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Guardando..." : "Guardar cliente"}
        </button>
      </div>
    </div>
  );
}
