import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SessionProvider, useSession } from "./auth/SessionContext";
import { LoginScreen, LoadingScreen } from "./auth/LoginScreen";
import { seedIfEmpty } from "./db/seedDatabase";
import { OnlineProvider } from "./sync/OnlineContext";
import { SyncProvider } from "./sync/SyncEngine";
import "./styles/theme.css";
import "./styles/app.css";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, localOnly, wipingLocal } = useSession();
  
  if (loading) return <LoadingScreen />;
  if (wipingLocal) return <LoadingScreen message="Preparando tu cuenta…" />;
  if (!localOnly && !session) return <LoginScreen />;
  
  return <>{children}</>;
}

if (import.meta.env.DEV) {
  seedIfEmpty();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OnlineProvider>
      <SessionProvider>
        <SyncProvider>
          <AuthGate>
            <App />
          </AuthGate>
        </SyncProvider>
      </SessionProvider>
    </OnlineProvider>
  </StrictMode>
);
