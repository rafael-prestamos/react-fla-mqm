export const statusColors = {
  good: '#16325C',   // navy principal, "estado deseado = color de marca"
  slow: '#F59E0B',   // ámbar (>7 días de atraso)
  bad: '#DC2626',    // rojo semáforo (>30 días de atraso)
} as const;

export type ClientStatus = keyof typeof statusColors;
