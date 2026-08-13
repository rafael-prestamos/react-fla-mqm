import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SessionProvider } from "./auth/SessionContext";
import { seedIfEmpty } from "./db/seedDatabase";

if (import.meta.env.DEV) {
  seedIfEmpty();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>
);
