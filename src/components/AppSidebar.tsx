"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  Wrench,
  LogOut,
  Shield,
  UserCheck,
  Settings,
  Package,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { UserSession } from "@/types";
import AuthLoadingOverlay from "@/components/AuthLoadingOverlay";

interface AppSidebarProps {
  user: UserSession;
  isTestMode?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onOpenMobile?: () => void;
  onCloseMobile?: () => void;
}

export default function AppSidebar({
  user,
  isTestMode = false,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onOpenMobile,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchTargetRole, setSwitchTargetRole] = useState<string>("");

  // Normalizar rol
  const role = String(user.role || "").toUpperCase();
  const normalizedRole: "ADMIN" | "RECEPTION" | "MECHANIC" =
    role === "ADMIN"
      ? "ADMIN"
      : role === "RECEPTION" || role === "RECEPCION"
      ? "RECEPTION"
      : "MECHANIC";

  // Manejo de Logout funcional con mínima carga visual perceptible
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await Promise.all([
        fetch("/api/auth/logout", { method: "POST" }),
        new Promise((r) => setTimeout(r, 600)),
      ]);
      window.location.href = "/login";
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      window.location.href = "/login";
    }
  };

  // Selector rápido exclusivo para modo de prueba (test@test.com)
  const handleQuickSwitch = async (email: string) => {
    const targetName = email.includes("admin")
      ? "Administrador"
      : email.includes("recepcion")
      ? "Recepción"
      : email.includes("test")
      ? "Usuario Test"
      : "Mecánico";

    setSwitchTargetRole(targetName);
    setIsSwitching(true);

    try {
      const [res] = await Promise.all([
        fetch("/api/auth/test-switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }),
        new Promise((r) => setTimeout(r, 650)),
      ]);

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
      } else {
        setIsSwitching(false);
      }
    } catch (err) {
      console.error("Error al cambiar rol:", err);
      setIsSwitching(false);
    }
  };

  // Definición de ítems del menú según RBAC
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
      roles: ["ADMIN", "RECEPTION", "MECHANIC"],
      mobileBadge: "Órdenes",
    },
    {
      href: "/app/clientes",
      label: "Clientes",
      icon: Users,
      roles: ["ADMIN", "RECEPTION", "MECHANIC"],
      mobileBadge: "Clientes",
    },
    {
      href: "/app/vehiculos",
      label: "Vehículos",
      icon: Car,
      roles: ["ADMIN", "RECEPTION", "MECHANIC"],
      mobileBadge: "Vehículos",
    },
    {
      href: "/app/taller/hoja-ruta",
      label: "Hoja de Trabajo",
      icon: Wrench,
      roles: ["ADMIN", "MECHANIC"],
      mobileBadge: "Taller",
    },
    {
      href: "/app/repuestos",
      label: "Repuestos",
      icon: Package,
      roles: ["ADMIN", "RECEPTION", "MECHANIC"],
      mobileBadge: "Repuestos",
    },
    {
      href: "/app/admin/personal",
      label: "Personal",
      icon: UserCheck,
      roles: ["ADMIN"],
      mobileBadge: "Personal",
    },
    {
      href: "/app/configuracion",
      label: "Configuración",
      icon: Settings,
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
      {/* Overlay de Carga al Cerrar Sesión */}
      <AuthLoadingOverlay
        isOpen={loggingOut}
        message="Cerrando sesión..."
        submessage="Finalizando sesión de forma segura..."
      />

      {/* Overlay de Carga al Cambiar de Rol (solo modo test) */}
      {isTestMode && (
        <AuthLoadingOverlay
          isOpen={isSwitching}
          message="Cambiando de usuario..."
          submessage={`Cargando perfil y permisos de ${switchTargetRole || "usuario"}...`}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. TOP BAR SOLO EN CELULARES (md:hidden)                                  */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-900 text-white px-3 sm:px-4 py-2 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          {/* Botón para abrir el drawer en celulares */}
          <button
            type="button"
            onClick={onOpenMobile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            aria-label="Abrir menú"
          >
            <Menu className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-[11px]">Menú</span>
          </button>

          <img
            src="/images/poggi/logo.png"
            alt="Logo POGGI"
            className="w-6 h-6 object-contain"
          />
          <div>
            <span className="font-black text-xs tracking-tight block leading-tight text-[#e5242b]">
              POGGI
            </span>
            <span
              className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border inline-block ${getRoleBadgeClasses(
                normalizedRole
              )}`}
            >
              {normalizedRole}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isTestMode && (
            <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/60">
              <button
                type="button"
                onClick={() => handleQuickSwitch("admin@taller.com")}
                disabled={isSwitching || loggingOut}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
                  user.email === "admin@taller.com"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Cambiar a Administrador"
              >
                Adm
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch("recepcion@taller.com")}
                disabled={isSwitching || loggingOut}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
                  user.email === "recepcion@taller.com"
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Cambiar a Recepción"
              >
                Rec
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch("mecanico@taller.com")}
                disabled={isSwitching || loggingOut}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
                  user.email === "mecanico@taller.com"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Cambiar a Mecánico"
              >
                Mec
              </button>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut || isSwitching}
            className="text-xs text-rose-300 hover:text-white flex items-center gap-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">Salir</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DRAWER OFF-CANVAS PARA CELULARES (md:hidden)                           */}
      {/* ========================================================================= */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
        <aside
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <Link
              href="/"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 group"
            >
              <img
                src="/images/poggi/logo.png"
                alt="Logo Poggi"
                className="w-8 h-8 object-contain drop-shadow"
              />
              <div>
                <h1 className="font-extrabold text-white text-xs tracking-tight leading-tight">
                  POGGI TALLER INTEGRAL
                </h1>
                <span className="text-[9px] text-[#e5242b] font-semibold tracking-wider uppercase block">
                  Panel de Gestión
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors flex items-center gap-1 cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-5 h-5 text-rose-400" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/app/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
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

          <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
            <button
              onClick={handleLogout}
              disabled={isSwitching || loggingOut}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700/80 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? "Cerrando..." : "Cerrar Sesión"}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 3. SIDEBAR PARA TABLET Y DESKTOP (md:flex)                                */}
      {/*    - Cuando isCollapsed = true: COLUMNA DE ICONOS (Acceso Rápido)         */}
      {/*    - Cuando isCollapsed = false: BARRA EXPANDIDA COMPLETA                */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-200 flex-col border-r border-slate-800 justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16 lg:w-20" : "w-64 lg:w-72"
        }`}
      >
        {/* PARTE SUPERIOR: LOGO + TOGGLE DE EXPANDIR / COLAPSAR */}
        <div>
          {isCollapsed ? (
            /* Header Colapsado: Logo e Icono para Expandir */
            <div className="py-3 px-2 flex flex-col items-center gap-2 border-b border-slate-800">
              <Link
                href="/"
                className="hover:scale-105 transition-transform"
                title="POGGI TALLER INTEGRAL"
              >
                <img
                  src="/images/poggi/logo.png"
                  alt="Logo Poggi"
                  className="w-8 h-8 object-contain drop-shadow"
                />
              </Link>

              {/* Botón táctil para expandir el menú */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 group relative"
                title="Expandir menú lateral"
                aria-label="Expandir menú"
              >
                <PanelLeft className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-800">
                  Expandir menú
                </span>
              </button>
            </div>
          ) : (
            /* Header Expandido: Marca completa + Botón para Colapsar a Columna */
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <Link href="/" className="flex items-center gap-3 group min-w-0">
                  <img
                    src="/images/poggi/logo.png"
                    alt="Logo Poggi"
                    className="w-9 h-9 object-contain drop-shadow shrink-0"
                  />
                  <div className="min-w-0">
                    <h1 className="font-extrabold text-white text-xs sm:text-sm tracking-tight leading-tight truncate">
                      POGGI TALLER INTEGRAL
                    </h1>
                    <span className="text-[10px] text-[#e5242b] font-semibold tracking-wider uppercase block">
                      Panel de Gestión
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Colapsar a columna de iconos"
                  aria-label="Colapsar menú"
                >
                  <PanelLeftClose className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Tarjeta de usuario en modo expandido */}
              <div className="mt-3.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2.5">
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
                      className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-md border ${getRoleBadgeClasses(
                        normalizedRole
                      )}`}
                    >
                      {normalizedRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MENÚ DE ICONOS / NAVEGACIÓN */}
          <nav className={`overflow-y-auto py-3 ${isCollapsed ? "px-2 space-y-2 flex flex-col items-center" : "px-3 space-y-1"}`}>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Menú Principal ({normalizedRole})
              </span>
            )}

            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/app/dashboard" && pathname.startsWith(item.href));

              if (isCollapsed) {
                /* Renderizado colapsado: Icono táctil centrado con Tooltip flotante */
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all group relative cursor-pointer ${
                      isActive
                        ? normalizedRole === "ADMIN"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105"
                          : normalizedRole === "RECEPTION"
                          ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 scale-105"
                          : "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {/* Tooltip flotante al pasar el mouse o tocar */}
                    <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-800">
                      {item.label}
                    </span>
                  </Link>
                );
              }

              /* Renderizado expandido: Icono + Label completo */
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  }}
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

        {/* PARTE INFERIOR: USUARIO + SIMULADOR TEST + CERRAR SESIÓN */}
        <div className={`border-t border-slate-800 bg-slate-900/90 ${isCollapsed ? "p-2 flex flex-col items-center gap-2" : "p-3 space-y-2.5"}`}>
          {isCollapsed ? (
            /* Pie Colapsado: Iniciales de Usuario + Test Pills + Botón Salir */
            <>
              {isTestMode && (
                <div className="flex flex-col gap-1 items-center" title="Cambiar rol rápido">
                  <button
                    type="button"
                    onClick={() => handleQuickSwitch("admin@taller.com")}
                    disabled={isSwitching || loggingOut}
                    className={`w-8 h-5 text-[9px] font-black rounded border transition-colors cursor-pointer ${
                      user.email === "admin@taller.com"
                        ? "bg-purple-600 text-white border-purple-400"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                    title="Modo ADMIN"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSwitch("recepcion@taller.com")}
                    disabled={isSwitching || loggingOut}
                    className={`w-8 h-5 text-[9px] font-black rounded border transition-colors cursor-pointer ${
                      user.email === "recepcion@taller.com"
                        ? "bg-sky-600 text-white border-sky-400"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                    title="Modo RECEPCIÓN"
                  >
                    R
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSwitch("mecanico@taller.com")}
                    disabled={isSwitching || loggingOut}
                    className={`w-8 h-5 text-[9px] font-black rounded border transition-colors cursor-pointer ${
                      user.email === "mecanico@taller.com"
                        ? "bg-emerald-600 text-white border-emerald-400"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                    title="Modo MECÁNICO"
                  >
                    M
                  </button>
                </div>
              )}

              {/* Avatar de usuario */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                  normalizedRole === "ADMIN"
                    ? "bg-purple-600 text-white"
                    : normalizedRole === "RECEPTION"
                    ? "bg-sky-600 text-white"
                    : "bg-emerald-600 text-white"
                }`}
                title={`${user.nombre} (${normalizedRole})`}
              >
                {user.nombre?.[0] || "U"}
              </div>

              {/* Botón Salir Colapsado */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSwitching || loggingOut}
                title="Cerrar sesión"
                className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 border border-slate-700/60 hover:border-rose-700/50 flex items-center justify-center transition-colors cursor-pointer group relative"
              >
                <LogOut className="w-4 h-4" />
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-800">
                  Cerrar Sesión
                </span>
              </button>
            </>
          ) : (
            /* Pie Expandido: Simulador completo de roles + Botón Cerrar Sesión completo */
            <>
              {isTestMode && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulador de Roles (Test)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickSwitch("admin@taller.com")}
                      disabled={isSwitching || loggingOut}
                      className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center truncate ${
                        user.email === "admin@taller.com"
                          ? "bg-purple-900/60 text-purple-200 border-purple-500"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSwitch("recepcion@taller.com")}
                      disabled={isSwitching || loggingOut}
                      className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center truncate ${
                        user.email === "recepcion@taller.com"
                          ? "bg-sky-900/60 text-sky-200 border-sky-500"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      }`}
                    >
                      Recep
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSwitch("mecanico@taller.com")}
                      disabled={isSwitching || loggingOut}
                      className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center truncate ${
                        user.email === "mecanico@taller.com"
                          ? "bg-emerald-900/60 text-emerald-200 border-emerald-500"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      }`}
                    >
                      Mecánico
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={isSwitching || loggingOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700/80 hover:border-rose-700/50 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? "Cerrando..." : "Cerrar Sesión"}</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 4. BARRA INFERIOR SOLO EN CELULARES PEQUEÑOS (sm:hidden)                  */}
      {/* ========================================================================= */}
      <nav
        aria-label="Navegación inferior móvil"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl px-2 py-1.5"
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
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                }}
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
    </>
  );
}
