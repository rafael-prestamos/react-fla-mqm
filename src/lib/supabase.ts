import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase (Postgres + Auth).
 * Las credenciales vienen de variables de entorno (ver .env.example).
 * La publishable key es pública por diseño: la seguridad real la da Auth + RLS.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true cuando el proyecto está configurado; permite correr 100% offline sin credenciales. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
