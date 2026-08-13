# Fla MpM — Gestor de Préstamos

PWA offline-first para gestionar préstamos y cobranzas. React + Vite + TypeScript,
datos locales con Dexie/IndexedDB y sync con Supabase.

## Requisitos
- Node 20+

## Desarrollo
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck (tsc) + build de producción en dist/
npm run preview  # sirve dist/ para probar la PWA
```

La app **funciona sin Supabase** (modo solo-local). Para activar sync/backup,
configura las variables de entorno.

## Variables de entorno
Copia `.env.example` a `.env` y completa:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
(La anon key es pública por diseño; la seguridad la dan Auth + RLS.)

## Supabase
1. Crea un proyecto en https://supabase.com
2. Ejecuta el SQL de `supabase/migrations/0001_init.sql` (SQL Editor).
3. Crea el usuario de la app (Authentication -> Users) con email + contraseña.
4. Copia URL y anon key al `.env` (dev) y a las variables de Vercel (prod).

## Deploy (Vercel + GitHub Actions)
`.github/workflows/deploy.yml` hace typecheck + build en cada push y despliega a
producción al hacer merge en `main`. Secrets en GitHub:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

Las variables `VITE_SUPABASE_*` van en el proyecto de Vercel (Environment Variables).

## Estructura
```
src/
  types/domain.ts        Modelo (Client, Loan, Payment) - ingles/camelCase
  lib/                   money (centimos), dates, id, supabase
  domain/loanRules.ts    Reglas puras: interes, mora, clasificacion
  db/database.ts         Dexie (IndexedDB) + tabla outbox
  repositories/          Patron Repository por entidad
  sync/outbox.ts         Patron Outbox (push a Supabase)
  auth/SessionContext.tsx  Sesion email+password (Provider/Context)
  seed.ts                Datos de ejemplo (Sprint 0)
  App.tsx                UI (tema navy)
supabase/migrations/     SQL + RLS
docs/DECISIONS.md        Registro canonico de decisiones
```

Ver `docs/DECISIONS.md` para decisiones, reglas de negocio y sprints.
