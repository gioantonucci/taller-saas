"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthLoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  submessage?: string;
}

export default function AuthLoadingOverlay({
  isOpen,
  message = "Cargando...",
  submessage = "Por favor espere un momento",
}: AuthLoadingOverlayProps) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isOpen) {
      setProgress(15);
      return;
    }

    // Progresión continua y orgánica hacia el 95% para calmar la ansiedad
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const remaining = 95 - prev;
        const step = Math.max(1, Math.floor(remaining * 0.12));
        return Math.min(95, prev + step);
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xs w-[88%] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Logo con Spinner concéntrico */}
        <div className="relative mb-4 flex items-center justify-center w-16 h-16">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600/20 to-sky-500/20 flex items-center justify-center border border-rose-500/30 shadow-inner">
            <img
              src="/images/poggi/logo.png"
              alt="POGGI"
              className="w-7 h-7 object-contain"
            />
          </div>
          <Loader2 className="w-16 h-16 text-[#e5242b] animate-spin absolute -inset-0" />
        </div>

        {/* Mensaje de Transición */}
        <h3 className="text-base font-extrabold text-white tracking-tight">
          {message}
        </h3>
        {submessage && (
          <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
            {submessage}
          </p>
        )}

        {/* Porcentaje de carga (sin barra de carga, solo spinner y porcentaje) */}
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e5242b] animate-pulse" />
          <span className="text-xs font-mono font-black text-white tracking-wider">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}
