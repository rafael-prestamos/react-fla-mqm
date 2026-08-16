import { useRef, useState } from "react";
import { useSession } from "./SessionContext";
import { BrandLogo } from "../components/brand/BrandLogo";
import { useKeyboardAwareInput } from "../ui/useKeyboardAwareInput";
import logoUrl from "../assets/logo.png";


const CSS = `
/* Sprint 7a-2b: fondo blanco, contenedor único, sin scroll */
.login-root {
  min-height: 100dvh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, system-ui, sans-serif;
  padding: 16px 20px;
  box-sizing: border-box;
}

/* Contenedor único: logo + título + formulario dentro del mismo borde */
.login-card {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(31, 64, 106, 0.18);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: transparent;
  box-sizing: border-box;
}

/* Cabecera: logo + nombre de la app */
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}
.login-logo-img {
  display: block;
  width: 88px;
  height: 88px;
  object-fit: contain;
  margin-bottom: 10px;
  filter: drop-shadow(0 3px 8px rgba(22, 50, 92, 0.13));
}
.login-brand {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: var(--navy);
  margin: 0;
  letter-spacing: -0.02em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-field {
  display: flex;
  flex-direction: column;
}
.login-label {
  font-weight: 500;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 5px;
}

/* Inputs: fondo blanco, borde navy sutil */
.login-input {
  background: #ffffff;
  border: 1px solid rgba(31, 64, 106, 0.22);
  border-radius: 8px;
  padding: 11px 14px;
  font-size: 15px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
  color: var(--ink);
}
.login-input:focus {
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(22, 50, 92, 0.08);
  outline: none;
}

/* Botón: caramelo #D49A5D, hover más oscuro */
.login-btn {
  width: 100%;
  background: var(--accent);
  color: #fff;
  padding: 13px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  border: none;
  cursor: pointer;
  margin-top: 16px;
  transition: background 0.18s, opacity 0.15s, transform 0.1s;
  font-family: inherit;
  letter-spacing: 0.01em;
}
.login-btn:hover:not(:disabled) {
  background: #bf8748;
}
.login-btn:active:not(:disabled) {
  transform: scale(0.985);
}
.login-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.login-error {
  background: var(--bad-soft);
  color: #7d281c;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  margin-top: 10px;
  text-align: center;
}

/* LoadingScreen: fondo blanco, mascota navy */
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
        <div className="loading-mascot">
          <BrandLogo size={64} />
        </div>
        <div style={{ color: "var(--navy)", fontWeight: 500, fontSize: 14, letterSpacing: "0.02em" }}>
          {message}
        </div>
      </div>
    </div>
  );
}


export function LoginScreen() {
  const formRef = useRef<HTMLFormElement>(null);
  useKeyboardAwareInput(formRef);
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

      {/* Contenedor único: logo + formulario dentro del mismo borde */}
      <div className="login-card">

        {/* Cabecera con logo y nombre */}
        <div className="login-header">
          <img
            src={logoUrl}
            alt="Fla MpM"
            className="login-logo-img"
          />
          <h1 className="login-brand">Fla MpM</h1>
        </div>

        <form
          ref={formRef}
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
