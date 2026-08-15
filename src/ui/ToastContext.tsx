import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast { id: string; kind: ToastKind; message: string }
interface Ctx {
  show: (kind: ToastKind, message: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const success = useCallback((msg: string) => show("success", msg), [show]);
  const error = useCallback((msg: string) => show("error", msg), [show]);
  const info = useCallback((msg: string) => show("info", msg), [show]);

  const ctxValue = useMemo(() => ({ show, success, error, info }), [show, success, error, info]);

  return (
    <ToastContext.Provider value={ctxValue}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <div className="toast-icon">
              {t.kind === "success" && <CheckCircle2 size={18} color="var(--good)" />}
              {t.kind === "error" && <AlertCircle size={18} color="var(--bad)" />}
              {t.kind === "info" && <Info size={18} color="var(--navy)" />}
            </div>
            <div className="toast-msg">{t.message}</div>
            <button className="toast-close" onClick={() => remove(t.id)}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 100px;
          right: 16px;
          left: 16px;
          max-width: 400px;
          margin-left: auto;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        .toast {
          pointer-events: auto;
          background: #fff;
          border-radius: 10px;
          padding: 12px 14px;
          box-shadow: 0 8px 24px rgba(18,40,69,.16);
          font-size: 13.5px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          animation: toast-in .2s ease-out;
        }
        .toast-success { border-left: 4px solid var(--good); }
        .toast-error { border-left: 4px solid var(--bad); }
        .toast-info { border-left: 4px solid var(--navy); }
        .toast-msg {
          flex: 1;
          color: var(--navy-deep);
          line-height: 1.4;
        }
        .toast-icon { margin-top: 1px; }
        .toast-close {
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        @keyframes toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
