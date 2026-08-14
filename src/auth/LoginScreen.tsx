import { useState } from "react";
import { useSession } from "./SessionContext";
import { PawPrint } from "lucide-react";

export function LoadingScreen({ message = "Cargando…" }: { message?: string }) {
  return (
    <div className="pf-root" style={{ alignItems: "center", background: "var(--navy-deep)", color: "var(--cream)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <PawPrint size={40} opacity={0.8} />
        <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "0.02em" }}>{message}</div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;
    
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="pf-root" style={{ background: "var(--navy)", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 360, padding: 20 }}>
        <div className="card" style={{ background: "var(--card)", borderRadius: 20, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
            <div style={{ background: "var(--navy-light)", color: "white", padding: 12, borderRadius: 16, marginBottom: 12 }}>
              <PawPrint size={32} />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>Fla MpM</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)" }}>Ingresa a tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Correo</label>
              <input 
                type="email" 
                className="inp" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={submitting} 
                autoComplete="email" 
                required 
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Contraseña</label>
              <input 
                type="password" 
                className="inp" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={submitting} 
                autoComplete="current-password" 
                required 
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-p btn-block" 
              style={{ marginTop: 8 }} 
              disabled={!email || !password || submitting}
            >
              {submitting ? "Ingresando…" : "Entrar"}
            </button>
            
            {error && (
              <div style={{ color: "var(--bad)", fontSize: 13, marginTop: 8, textAlign: "center", fontWeight: 500 }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
