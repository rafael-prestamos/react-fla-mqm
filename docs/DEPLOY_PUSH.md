# Deploy de Push Notifications (Sprint 5b-2) — checklist manual

El código de este sprint (migración, Edge Function, service worker, módulo de
suscripción, UI) está en el repo, pero **no se puede desplegar desde el agente**:
requiere el Supabase CLI autenticado contra el proyecto y acceso a los
dashboards de Supabase/Vercel. Estos pasos los ejecuta una persona con esos
accesos, una sola vez (y de nuevo solo si cambian las VAPID keys).

## 1. VAPID keys

Ya generadas para este sprint (ver PR #12 / Giancarlo):

- **Pública:** `BCX6wvMjqT1FYJwOOM8YYzPfygdX3n29Pm3Ln0rW7SiK2kDjBlUJgCcbOU5gzTeYSqq8RL_MgIQlHbZiFMhADBQ`
- **Privada:** se comparte por fuera del repo (chat/gestor de secretos) — nunca se commitea.

Si hace falta regenerarlas:

```bash
npx web-push generate-vapid-keys --json
```

## 2. Variables de entorno

- **Vercel** (proyecto `react-fla-mqm`, entorno Production/Preview): agregar
  `VITE_VAPID_PUBLIC_KEY` con la clave pública.
- **Supabase → Project Settings → Edge Functions → Secrets**: agregar
  - `VAPID_PUBLIC_KEY` (la misma clave pública)
  - `VAPID_PRIVATE_KEY` (la clave privada — nunca en el frontend)
  - `VAPID_SUBJECT` = `mailto:giancarlo@email.com` (o el correo real de contacto)

## 3. Aplicar la migración

En el SQL Editor de Supabase, correr el contenido de
`supabase/migrations/0009_push_subscriptions.sql` (o vía CLI si está enlazado
el proyecto: `supabase db push`).

## 4. Desplegar la Edge Function

Con el Supabase CLI autenticado y el proyecto enlazado (`supabase link`):

```bash
supabase functions deploy daily-push
```

## 5. Habilitar pg_cron y pg_net

En Supabase Dashboard → Database → Extensions, habilitar `pg_cron` y `pg_net`
si no lo están.

## 6. Programar la invocación diaria

En el SQL Editor de Supabase:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-push-7am',
  '0 12 * * *', -- UTC = 7:00am hora Perú (UTC-5, sin horario de verano)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Si `pg_net` no está disponible en el plan, alternativa: un cron externo
(GitHub Actions `schedule`, o cron-job.org gratuito) que haga `POST` al
endpoint de la Edge Function (`https://<project>.functions.supabase.co/daily-push`)
con el `service_role_key` como `Authorization: Bearer`.

## 7. Verificar

```bash
curl -X POST https://<project>.functions.supabase.co/daily-push \
  -H "Authorization: Bearer <service_role_key>"
```

Debería responder `{"sent": N, "date": "YYYY-MM-DD"}`.

## 8. Probar en el dispositivo de Fla

1. Abrir la PWA instalada (Android, Chrome).
2. Login → debería aparecer el modal "Resumen diario de cobros" → tocar
   "Activar notificaciones" → aceptar el permiso del navegador.
3. Confirmar en Ajustes que el botón dice "Activadas".
4. Esperar a las 7am del día siguiente (o invocar la función manualmente con
   el `curl` de arriba) y confirmar que llega la notificación.
