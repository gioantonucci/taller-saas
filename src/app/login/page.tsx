"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  Clock,
  UserCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired");
  const inactivity = searchParams.get("inactivity");
  const from = searchParams.get("from");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPassword = customPass || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Redirección inteligente según el rol del usuario o URL previa
      const role = String(data.user?.role || "").toUpperCase();
      if (from && from.startsWith("/") && !from.startsWith("//")) {
        router.push(from);
      } else if (role === "MECHANIC" || role === "MECANICO") {
        router.push("/app/taller/hoja-ruta");
      } else if (role === "RECEPTION" || role === "RECEPCION") {
        router.push("/app/ordenes");
      } else {
        router.push("/app/dashboard");
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor de autenticación");
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    handleLogin(undefined, roleEmail, rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-sky-950">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-white text-xl tracking-tight block">
                TALLER <span className="text-sky-400">CENTRAL</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                SaaS Automotor • Fase 1
              </span>
            </div>
          </Link>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mt-4">
            Ingreso al Sistema
          </h2>
        </div>

        {/* Notificaciones de expiración o inactividad */}
        {inactivity && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Su sesión se cerró automáticamente por 30 minutos de inactividad.</span>
          </div>
        )}
        {expired && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Su sesión ha expirado o no está autenticado. Por favor ingrese credenciales.</span>
          </div>
        )}

        {/* Error form */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Error de autenticación</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Card Formulario */}
        <div className="mt-6 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@taller.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Botones de Acceso Rápido Demo (1-Click Login para evaluadores) */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3 flex items-center justify-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Acceso Rápido de Prueba</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@taller.com", "admin123")}
                className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-700/50 text-left transition-colors group cursor-pointer"
              >
                <span className="block text-[11px] font-bold text-purple-300 group-hover:text-purple-200">
                  👑 ADMIN
                </span>
                <span className="block text-[10px] text-slate-400 truncate">Carlos Rossi (Dueño)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("recepcion@taller.com", "recepcion123")}
                className="p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-700/50 text-left transition-colors group cursor-pointer"
              >
                <span className="block text-[11px] font-bold text-sky-300 group-hover:text-sky-200">
                  📋 RECEPTION
                </span>
                <span className="block text-[10px] text-slate-400 truncate">María Gómez (Recepción)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("mecanico@taller.com", "mecanico123")}
                className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/50 text-left transition-colors group cursor-pointer"
              >
                <span className="block text-[11px] font-bold text-emerald-300 group-hover:text-emerald-200">
                  🔧 MECHANIC
                </span>
                <span className="block text-[10px] text-slate-400 truncate">Lucas Benítez (Taller)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
          Cargando autenticación...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
