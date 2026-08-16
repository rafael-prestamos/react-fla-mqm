import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { pushOutbox } from "./outbox";
import { pullFromSupabase } from "./pull";
import { useOnline } from "./OnlineContext";
import { useSession } from "../auth/SessionContext";
import { useToast } from "../ui/ToastContext";

interface SyncState {
  status: "synced" | "syncing" | "offline" | "error";
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

const SyncContext = createContext<SyncState & { forcePush: () => Promise<void>; forcePull: () => Promise<void> }>({
  status: "offline",
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
  forcePush: async () => {},
  forcePull: async () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const { online } = useOnline();
  const { session } = useSession();
  const toast = useToast();
  
  const pendingCount = useLiveQuery(() => db.outbox.filter((e) => !e.syncedAt).count()) ?? 0;
  
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const pushRunningRef = useRef(false);
  const needsRerunRef = useRef(false);
  
  const lastWasErrorRef = useRef(false);

  const handleSuccess = () => {
    if (lastWasErrorRef.current) {
      toast.success("Sincronización restaurada");
      lastWasErrorRef.current = false;
    }
  };

  const handleError = (e: unknown, msg: string) => {
    setLastError(e instanceof Error ? e.message : msg);
    if (!lastWasErrorRef.current) {
      toast.error(msg);
      lastWasErrorRef.current = true;
    }
  };

  const forcePush = async () => {
    if (!online || !session) return;
    if (pushRunningRef.current) {
      needsRerunRef.current = true;
      return;
    }
    
    pushRunningRef.current = true;
    setIsPushing(true);
    setLastError(null);

    try {
      const result = await pushOutbox();
      if (result.deadLettered > 0) {
        handleError(null, `${result.deadLettered} cambios no se pudieron enviar tras varios intentos`);
      } else if (result.errors > 0) {
        handleError(null, "Error al enviar algunos cambios");
      } else if (result.synced > 0) {
        setLastSyncAt(new Date().toISOString());
        handleSuccess();
      } else {
        handleSuccess(); // Even if 0 synced, we succeeded
      }
    } catch (e) {
      handleError(e, "Error de sincronización");
    } finally {
      pushRunningRef.current = false;
      setIsPushing(false);
      
      if (needsRerunRef.current) {
        needsRerunRef.current = false;
        void forcePush();
      }
    }
  };

  const forcePull = async () => {
    if (!online || !session) return;
    setIsPulling(true);
    setLastError(null);
    try {
      await pullFromSupabase();
      setLastSyncAt(new Date().toISOString());
      handleSuccess();
    } catch (e) {
      handleError(e, "Error descargando datos");
    } finally {
      setIsPulling(false);
    }
  };

  // 1. Auto push when pendingCount > 0
  useEffect(() => {
    if (pendingCount > 0 && online && session) {
      void forcePush();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount, online, session]);

  // 2. React to network / session transitions
  const prevOnlineRef = useRef(online);
  const prevSessionRef = useRef(!!session);

  useEffect(() => {
    const becameOnline = online && !prevOnlineRef.current;
    const justLoggedIn = !!session && !prevSessionRef.current;

    prevOnlineRef.current = online;
    prevSessionRef.current = !!session;

    if (becameOnline && session) {
      void forcePull().then(() => forcePush());
    } else if (justLoggedIn && online) {
      void forcePull();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, session]);

  let status: SyncState["status"] = "synced";
  if (!online) {
    status = "offline";
  } else if (isPushing || isPulling) {
    status = "syncing";
  } else if (lastError) {
    status = "error";
  } else if (pendingCount > 0) {
    status = "syncing";
  }

  return (
    <SyncContext.Provider value={{ status, pendingCount, lastSyncAt, lastError, forcePush, forcePull }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
