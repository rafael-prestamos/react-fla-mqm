/**
 * Contexto de sesión. Patrón: Provider + Context.
 * Envuelve la autenticación email+password de Supabase y expone el estado de sesión.
 * Si Supabase no está configurado, opera en modo local (sin login) para desarrollo.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getLocalOwner, setLocalOwner, clearLocalOwner } from "../db/localOwnership";
import { nukeLocalData } from "../db/nukeLocal";
import { pullFromSupabase } from "../sync/pull";
import { ensureSettings } from "../db/ensureSettings";
import { migrateNamesToUpperV1 } from "../lib/migrations/migrateNamesToUpperV1";

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  /** true cuando corremos sin Supabase (solo local). */
  localOnly: boolean;
  /** true cuando se está limpiando la base local (ej. tras cambio de usuario). */
  wipingLocal: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [wipingLocal, setWipingLocal] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function handleSessionChange() {
      const currentUserId = session?.user?.id;
      if (!currentUserId) return; // No session
      
      const localOwner = getLocalOwner();
      setWipingLocal(true);
      try {
        if (localOwner === null || localOwner !== currentUserId) {
          await nukeLocalData();
          setLocalOwner(currentUserId);
        }
        // Orden importante: pull primero (trae settings de otro dispositivo si existen),
        // ensureSettings después (siembra defaults solo si el usuario es nuevo).
        await pullFromSupabase();
        await ensureSettings();
        const migRes = await migrateNamesToUpperV1();
        if (!migRes.skipped) {
          console.log("[Migration] namesToUpper v1:", migRes);
        }
      } catch (e) {
        console.error("Error en pull inicial:", e);
        // Permitir reintentos? El flag se apaga y el sync background reintentará
      } finally {
        setWipingLocal(false);
      }
    }
    handleSessionChange();
  }, [session?.user?.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      loading,
      wipingLocal,
      localOnly: !isSupabaseConfigured,
      async signIn(email, password) {
        if (!supabase) return { error: "Supabase no configurado" };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        if (!supabase) return;
        setWipingLocal(true);
        try {
          await nukeLocalData();
          clearLocalOwner();
          await supabase.auth.signOut();
        } finally {
          setWipingLocal(false);
        }
      },
    }),
    [session, loading, wipingLocal]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
