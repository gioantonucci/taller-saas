"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  Wrench,
  History,
  LogOut,
  Shield,
  UserCheck,
  Settings,
  Activity,
} from "lucide-react";
import { UserSession } from "@/types";

interface AppSidebarProps {
  user: UserSession;
}

export default function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Normalizar rol
  const role = String(user.role || "").toUpperCase();
  const normalizedRole: "ADMIN" | "RECEPTION" | "MECHANIC" =
    role === "ADMIN"
      ? "ADMIN"
      : role === "RECEPTION" || role === "RECEPCION"
      ? "RECEPTION"
      : "MECHANIC";

  // Manejo de Logout funcional
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      window.location.href = "/login";
    }
  };

  // Selector rápido para pruebas (evaluación de roles en 1 clic)
  const handleQuickSwitch = async (email: string) => {
    setIsSwitching(true);
    try {
      const password = email.includes("admin")
        ? "admin123"
        : email.includes("recepcion")
        ? "recepcion123"
        : "mecanico123";

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const nextRole = String(data.user?.role || "").toUpperCase();
        if (nextRole === "MECHANIC" || nextRole === "MECANICO") {
          window.location.href = "/app/taller/hoja-ruta";
        } else if (nextRole === "RECEPTION" || nextRole === "RECEPCION") {
          window.location.href = "/app/ordenes";
        } else {
          window.location.href = "/app/dashboard";
        }
      }
    } catch (err) {
      console.error("Error al cambiar rol:", err);
      setIsSwitching(false);
    }
  };

  // Definición de ítems del menú según RBAC para el MVP V1
  const allNavItems = [
    {
      href: "/app/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN"],
    },
    {
      href: "/app/ordenes",
      label: "Órdenes",
      icon: ClipboardList,
      roles: ["ADMIN", "RECEPTION"],
      mobileBadge: "Órdenes",
    },
    {
      href: "/app/clientes",
      label: "Clientes",
      icon: Users,
      roles: ["ADMIN", "RECEPTION"],
      mobileBadge: "Clientes",
    },
    {
      href: "/app/vehiculos",
      label: "Vehículos",
      icon: Car,
      roles: ["ADMIN", "RECEPTION"],
      mobileBadge: "Vehículos",
    },
    {
      href: "/app/taller/hoja-ruta",
      label: "Hoja de Ruta",
      icon: Wrench,
      roles: ["ADMIN", "MECHANIC"],
      mobileBadge: "Taller",
    },
    {
      href: "/app/admin/auditoria",
      label: "Historial y Auditoría",
      icon: History,
      roles: ["ADMIN"],
      mobileBadge: "Historial",
    },
    {
      href: "/app/configuracion",
      label: "Configuración",
      icon: Settings,
      roles: ["ADMIN"],
    },
    {
      href: "/app/admin/monitoreo",
      label: "Monitoreo",
      icon: Activity,
      roles: ["ADMIN"],
    },
  ];

  // Filtrar estrictamente según el rol del usuario logueado
  const filteredNavItems = allNavItems.filter((item) =>
    item.roles.includes(normalizedRole)
  );

  const getRoleBadgeClasses = (r: string) => {
    switch (r) {
      case "ADMIN":
        return "bg-purple-950/80 text-purple-300 border-purple-700/60";
      case "RECEPTION":
        return "bg-sky-950/80 text-sky-300 border-sky-700/60";
      case "MECHANIC":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-700/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP BAR MOBILE (Visible en celulares: md:hidden)                       */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <img
            src="/images/poggi/logo.png"
            alt="Logo POGGI"
            className="w-7 h-7 object-contain"
          />
          <div>
            <span className="font-black text-sm tracking-tight block leading-tight text-[#e5242b]">
              POGGI
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border inline-block ${getRoleBadgeClasses(
                normalizedRole
              )}`}
            >
              {normalizedRole}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-xs text-rose-300 hover:text-white flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Salir</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 2. BOTTOM NAVIGATION BAR MOBILE (Solo para roles con múltiples secciones: ADMIN / RECEPTION) */}
      {/* ========================================================================= */}
      {normalizedRole !== "MECHANIC" && (
        <nav
          aria-label="Navegación inferior móvil"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl px-2 py-1.5"
        >
          <div className="flex items-center justify-around gap-1 overflow-x-auto no-scrollbar">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/app/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] text-center ${
                    isActive
                      ? normalizedRole === "ADMIN"
                        ? "text-purple-400 bg-purple-500/15 font-bold"
                        : normalizedRole === "RECEPTION"
                        ? "text-sky-400 bg-sky-500/15 font-bold"
                        : "text-emerald-400 bg-emerald-500/15 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                  />
                  <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[70px]">
                    {item.mobileBadge || item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* ========================================================================= */}
      {/* 3. SIDEBAR DESKTOP (Visible en pantallas medianas y grandes: md:flex)     */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 z-40 w-64 lg:w-72 bg-slate-900 text-slate-200 flex-col border-r border-slate-800 justify-between">
        {/* Parte Superior: Branding + Perfil + Navegación */}
        <div className="flex-1 overflow-y-auto">
          {/* Logo y Encabezado del Taller */}
          <div className="p-5 border-b border-slate-800">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/images/poggi/logo.png"
                alt="Logo Poggi Taller Integral"
                className="w-10 h-10 object-contain drop-shadow"
              />
              <div>
                <h1 className="font-extrabold text-white text-sm tracking-tight leading-tight">
                  POGGI TALLER INTEGRAL
                </h1>
                <span className="text-[10px] text-[#e5242b] font-semibold tracking-wider uppercase block">
                  Panel de Gestión
                </span>
              </div>
            </Link>

            {/* Tarjeta de Usuario y Rol Activo */}
            <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    normalizedRole === "ADMIN"
                      ? "bg-purple-600 text-white"
                      : normalizedRole === "RECEPTION"
                      ? "bg-sky-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {user.nombre?.[0] || "U"}
                  {user.apellido?.[0] || ""}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user.nombre} {user.apellido || ""}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Shield className="w-3 h-3 text-sky-400" />
                    <span
                      className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border ${getRoleBadgeClasses(
                        normalizedRole
                      )}`}
                    >
                      {normalizedRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menú de Navegación Condicional por Rol */}
          <nav className="p-3 space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Menú Principal ({normalizedRole})
            </span>

            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/app/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? normalizedRole === "ADMIN"
                        ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30"
                        : normalizedRole === "RECEPTION"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Parte Inferior: Selector Rápido de Prueba y Botón Cerrar Sesión */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/90">
          {/* Selector Rápido de Rol para Pruebas */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Simulador de Roles (Test)</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickSwitch("admin@taller.com")}
                disabled={isSwitching}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center truncate ${
                  normalizedRole === "ADMIN"
                    ? "bg-purple-900/60 text-purple-200 border-purple-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
                title="Cambiar a ADMIN"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch("recepcion@taller.com")}
                disabled={isSwitching}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center truncate ${
                  normalizedRole === "RECEPTION"
                    ? "bg-sky-900/60 text-sky-200 border-sky-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
                title="Cambiar a RECEPTION"
              >
                Recep
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch("mecanico@taller.com")}
                disabled={isSwitching}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center truncate ${
                  normalizedRole === "MECHANIC"
                    ? "bg-emerald-900/60 text-emerald-200 border-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
                title="Cambiar a MECHANIC"
              >
                Mecánico
              </button>
            </div>
          </div>

          {/* Botón de Cerrar Sesión */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700/80 hover:border-rose-700/50 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? "Cerrando..." : "Cerrar Sesión"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
