export interface ClientInput {
  name: string;
  dni: string;
  phone: string;
}

export type ClientErrors = Partial<Record<"name" | "dni" | "phone", string>>;

export function validateClientInput(input: ClientInput): { ok: boolean; errors: ClientErrors } {
  const errors: ClientErrors = {};
  const name = input.name.trim();
  const dni = input.dni.trim();
  const phone = input.phone.trim();

  if (name.length < 2) {
    errors.name = "Ingresa el nombre";
  }

  if (!/^\d{8}$/.test(dni)) {
    errors.dni = "El DNI debe tener 8 dígitos";
  }

  if (!/^9\d{8}$/.test(phone)) {
    errors.phone = "El celular debe tener 9 dígitos y empezar con 9";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
