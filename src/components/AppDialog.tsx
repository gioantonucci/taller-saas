"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Trash2,
  X,
  Lock,
} from "lucide-react";

export type DialogVariant = "danger" | "warning" | "success" | "info" | "primary";

export interface DialogOptions {
  title?: string;
  message: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: "warning" | "danger" | "success" | "info" | "shield" | "trash" | "lock";
  type?: "alert" | "confirm";
}

interface AppDialogContextValue {
  confirm: (opts: DialogOptions | string) => Promise<boolean>;
  alert: (opts: DialogOptions | string) => Promise<void>;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

let globalDialogHandler: {
  confirm: (opts: DialogOptions | string) => Promise<boolean>;
  alert: (opts: DialogOptions | string) => Promise<void>;
} | null = null;

export const appConfirm = (opts: DialogOptions | string): Promise<boolean> => {
  if (globalDialogHandler) {
    return globalDialogHandler.confirm(opts);
  }
  const msg = typeof opts === "string" ? opts : (typeof opts.message === "string" ? opts.message : "Confirmar acción");
  return Promise.resolve(typeof window !== "undefined" ? window.confirm(msg) : true);
};

export const appAlert = (opts: DialogOptions | string): Promise<void> => {
  if (globalDialogHandler) {
    return globalDialogHandler.alert(opts);
  }
  const msg = typeof opts === "string" ? opts : (typeof opts.message === "string" ? opts.message : "Notificación");
  if (typeof window !== "undefined") {
    window.alert(msg);
  }
  return Promise.resolve();
};

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    return {
      confirm: appConfirm,
      alert: appAlert,
    };
  }
  return ctx;
}

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: DialogOptions;
  }>({
    isOpen: false,
    options: { message: "" },
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const normalizeOptions = useCallback((opts: DialogOptions | string, type: "alert" | "confirm"): DialogOptions => {
    if (typeof opts === "string") {
      let raw = opts.trim();
      let detectedVariant: DialogVariant = type === "confirm" ? "warning" : "info";
      let detectedIcon: DialogOptions["icon"] = undefined;
      let title: string | undefined = undefined;

      if (raw.startsWith("⚠️")) {
        detectedVariant = "warning";
        detectedIcon = "warning";
        raw = raw.replace(/^⚠️\s*/, "");
      } else if (raw.startsWith("❌")) {
        detectedVariant = "danger";
        detectedIcon = "danger";
        raw = raw.replace(/^❌\s*/, "");
      } else if (raw.startsWith("✅")) {
        detectedVariant = "success";
        detectedIcon = "success";
        raw = raw.replace(/^✅\s*/, "");
      }

      if (raw.startsWith("ATENCIÓN:") || raw.startsWith("Operación denegada:") || raw.startsWith("Error:") || raw.startsWith("Atención:")) {
        const parts = raw.split(":");
        title = parts[0].trim();
        raw = parts.slice(1).join(":").trim();
      }

      return {
        type,
        title,
        message: raw,
        variant: detectedVariant,
        icon: detectedIcon,
        confirmText: type === "confirm" ? "Confirmar" : "Entendido",
        cancelText: "Cancelar",
      };
    }

    return {
      type,
      confirmText: opts.confirmText || (type === "confirm" ? "Confirmar" : "Entendido"),
      cancelText: opts.cancelText || "Cancelar",
      variant: opts.variant || (type === "confirm" ? "warning" : "info"),
      ...opts,
    };
  }, []);

  const confirm = useCallback((opts: DialogOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        options: normalizeOptions(opts, "confirm"),
      });
    });
  }, [normalizeOptions]);

  const alert = useCallback((opts: DialogOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setDialogState({
        isOpen: true,
        options: normalizeOptions(opts, "alert"),
      });
    });
  }, [normalizeOptions]);

  useEffect(() => {
    globalDialogHandler = { confirm, alert };
    return () => {
      globalDialogHandler = null;
    };
  }, [confirm, alert]);

  const handleClose = (result: boolean) => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  useEffect(() => {
    if (!dialogState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose(false);
      } else if (e.key === "Enter" && dialogState.options.type === "alert") {
        handleClose(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogState.isOpen, dialogState.options.type]);

  const { options, isOpen } = dialogState;
  const isConfirm = options.type === "confirm";
  const variant = options.variant || (isConfirm ? "warning" : "info");

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-100 text-rose-600 border border-rose-200",
          buttonBg: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20",
          defaultTitle: isConfirm ? "¿Confirmar eliminación?" : "Operación no permitida",
          defaultIcon: <AlertCircle className="w-6 h-6" />,
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        };
      case "success":
        return {
          iconBg: "bg-emerald-100 text-emerald-600 border border-emerald-200",
          buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20",
          defaultTitle: isConfirm ? "¿Confirmar acción?" : "Operación exitosa",
          defaultIcon: <CheckCircle2 className="w-6 h-6" />,
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "warning":
        return {
          iconBg: "bg-amber-100 text-amber-700 border border-amber-200",
          buttonBg: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20",
          defaultTitle: isConfirm ? "¿Confirmar acción?" : "Atención requerida",
          defaultIcon: <AlertTriangle className="w-6 h-6" />,
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "primary":
        return {
          iconBg: "bg-sky-100 text-sky-700 border border-sky-200",
          buttonBg: "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20",
          defaultTitle: isConfirm ? "¿Confirmar acción?" : "Información del sistema",
          defaultIcon: <Info className="w-6 h-6" />,
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
        };
      case "info":
      default:
        return {
          iconBg: "bg-indigo-100 text-indigo-700 border border-indigo-200",
          buttonBg: "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20",
          defaultTitle: isConfirm ? "¿Desea continuar?" : "Aviso del taller",
          defaultIcon: <Info className="w-6 h-6" />,
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const styles = getVariantStyles();

  const renderIcon = () => {
    if (options.icon === "trash") return <Trash2 className="w-6 h-6 text-rose-600" />;
    if (options.icon === "shield") return <ShieldAlert className="w-6 h-6 text-amber-600" />;
    if (options.icon === "lock") return <Lock className="w-6 h-6 text-amber-600" />;
    if (options.icon === "danger") return <AlertCircle className="w-6 h-6 text-rose-600" />;
    if (options.icon === "warning") return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    if (options.icon === "success") return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
    if (options.icon === "info") return <Info className="w-6 h-6 text-sky-600" />;
    return styles.defaultIcon;
  };

  const renderFormattedMessage = (msg: string | React.ReactNode) => {
    if (typeof msg !== "string") {
      return msg;
    }

    const paragraphs = msg.split(/\n+/).filter((p) => p.trim().length > 0);
    if (paragraphs.length <= 1) {
      return <p className="text-sm text-slate-600 leading-relaxed font-normal">{msg}</p>;
    }

    return (
      <div className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
        {paragraphs.map((p, idx) => {
          const isWarningCallout = p.toLowerCase().includes("cerrado e inmutable") || p.toLowerCase().includes("no se podrá");
          if (isWarningCallout) {
            return (
              <div
                key={idx}
                className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900 leading-snug flex items-start gap-2 shadow-2xs"
              >
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{p}</span>
              </div>
            );
          }
          return (
            <p key={idx} className="font-normal">
              {p}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <AppDialogContext.Provider value={{ confirm, alert }}>
      {children}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => handleClose(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col p-5 sm:p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera con Icono y Botón de Cierre */}
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${styles.iconBg}`}>
                  {renderIcon()}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {options.title || styles.defaultTitle}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Poggi Taller Integral
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleClose(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Mensaje */}
            <div className="py-2.5">
              {renderFormattedMessage(options.message)}

              {options.description && (
                <div className="mt-2 text-xs text-slate-500 font-medium">
                  {options.description}
                </div>
              )}
            </div>

            {/* Acciones del Modal */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5">
              {isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  {options.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2 ${styles.buttonBg}`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}
