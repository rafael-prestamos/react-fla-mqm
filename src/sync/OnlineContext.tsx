import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const OnlineContext = createContext<{ online: boolean }>({ online: true });

export function OnlineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OnlineContext.Provider value={{ online }}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnline() {
  return useContext(OnlineContext);
}
