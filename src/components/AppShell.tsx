"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserSession } from "@/types";
import InactivityHandler from "@/components/InactivityHandler";
import AppSidebar from "@/components/AppSidebar";

interface AppShellProps {
  user: UserSession;
  isTestMode?: boolean;
  children: React.ReactNode;
}

export default function AppShell({
  user,
  isTestMode = false,
  children,
}: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  // Cargar preferencia guardada o definir según ancho de pantalla
  useEffect(() => {
    try {
      const saved = localStorage.getItem("poggi_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      } else {
        // En tablets y pantallas menores a 1024px, inicia colapsado en columna de iconos
        setIsCollapsed(window.innerWidth < 1024);
      }
    } catch {
      setIsCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("poggi_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Cerrar drawer de celular al navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Cerrar drawer de celular con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <InactivityHandler />

      {/* Sidebar unificado: Drawer en celulares (< md) y columna colapsable/expandible en tablet y desktop (>= md) */}
      <AppSidebar
        user={user}
        isTestMode={isTestMode}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onOpenMobile={() => setIsMobileOpen(true)}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Contenido principal:
          - En celulares (< md): pl-0
          - En tablet y desktop colapsado (>= md): md:pl-16 lg:pl-20 (deja columna de iconos para acceso rápido)
          - En tablet y desktop expandido: md:pl-64 lg:pl-72 */}
      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 pb-16 md:pb-8 ${
          isCollapsed ? "md:pl-16 lg:pl-20" : "md:pl-64 lg:pl-72"
        }`}
      >
        <div className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
