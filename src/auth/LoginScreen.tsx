import { useState } from "react";
import { useSession } from "./SessionContext";
import { BrandLogo } from "../components/brand/BrandLogo";

const CSS = `
.login-root {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(160deg, var(--navy-deep), var(--navy) 70%, var(--navy-light));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, system-ui, sans-serif;
  padding: 20px;
}
.login-card {
  width: 100%;
  max-width: 380px;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(18, 40, 69, 0.35);
  background: #fff;
}
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}
.login-icon-bg {
  background: var(--navy);
  color: var(--cream);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.login-brand {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: var(--navy-deep);
  margin: 0 0 4px;
}
.login-subtitle {
  font-weight: 400;
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.login-field {
  display: flex;
  flex-direction: column;
}
.login-label {
  font-weight: 500;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 6px;
}
.login-input {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  width: 100%;
  transition: border-color 0.15s;
  font-family: inherit;
  color: var(--ink);
}
.login-input:focus {
  border-color: var(--accent);
  outline: none;
}
.login-btn {
  width: 100%;
  background: var(--navy);
  color: #fff;
  padding: 14px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  border: none;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.15s, opacity 0.15s;
  font-family: inherit;
}
.login-btn:hover:not(:disabled) {
  background: var(--navy-deep);
}
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.login-error {
  background: var(--bad-soft);
  color: #7d281c;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  margin-top: 12px;
  text-align: center;
}

@keyframes pulse-mascot {
  0% { opacity: 0.5; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0.5; transform: scale(0.98); }
}
.loading-mascot {
  animation: pulse-mascot 1.5s ease-in-out infinite;
}
`;

export function LoadingScreen({ message = "Cargando…" }: { message?: string }) {
  return (
    <div className="login-root">
      <style>{CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div className="loading-mascot" style={{ color: "var(--cream)" }}>
          <BrandLogo size={48} />
        </div>
        <div style={{ color: "var(--cream)", fontWeight: 500, fontSize: 14, letterSpacing: "0.02em" }}>
          {message}
        </div>
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

  async function handleSubmit() {
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
    <div className="login-root">
      <style>{CSS}</style>
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-bg">
            <BrandLogo size={40} />
          </div>
          <h1 className="login-brand">Fla MpM</h1>
          <p className="login-subtitle">Gestor de préstamos</p>
        </div>

        <form 
          className="login-form" 
          onSubmit={(e) => { 
            e.preventDefault(); 
            handleSubmit(); 
          }}
        >
          <div className="login-field">
            <label htmlFor="login-email" className="login-label">Correo</label>
            <input 
              id="login-email"
              type="email" 
              className="login-input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={submitting} 
              autoComplete="email" 
              inputMode="email"
              required 
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password" className="login-label">Contraseña</label>
            <input 
              id="login-password"
              type="password" 
              className="login-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={submitting} 
              autoComplete="current-password" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn" 
            disabled={!email || !password || submitting}
          >
            {submitting ? "Ingresando…" : "Entrar"}
          </button>
          
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
