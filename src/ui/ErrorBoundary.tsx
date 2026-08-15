import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log estructurado. En Sprint 3/4 futuro cuando se enchufe Sentry, este es el punto de captura.
    console.error("[ErrorBoundary]", error, info);
  }
  handleReload = () => window.location.reload();
  handleReset = () => this.setState({ error: null });
  render() {
    if (this.state.error) {
      return (
        <div className="pf-root">
          <div style={{ maxWidth: 380, margin: "80px auto", padding: 32, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(18,40,69,.18)", textAlign: "center" }}>
            <AlertTriangle size={44} color="var(--bad)" style={{ marginBottom: 12 }} />
            <h2 style={{ margin: "0 0 8px", color: "var(--navy-deep)" }}>Algo salió mal</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
              Ocurrió un error inesperado. Puedes reintentar o recargar la app.
              Tus datos locales están a salvo.
            </p>
            <button className="btn btn-p btn-block" onClick={this.handleReset} style={{ marginBottom: 8 }}>Reintentar</button>
            <button className="btn btn-ghost btn-block" onClick={this.handleReload}><RefreshCw size={15} /> Recargar app</button>
            <details style={{ marginTop: 18, textAlign: "left", fontSize: 11, color: "var(--muted)" }}>
              <summary style={{ cursor: "pointer" }}>Detalle técnico</summary>
              <pre style={{ overflow: "auto", padding: 8, background: "var(--paper)", borderRadius: 8, marginTop: 6 }}>{this.state.error.message}
{this.state.error.stack}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
