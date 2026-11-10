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
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  // Cerrar drawer de navegación al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Cerrar con tecla Escape
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

      {/* Componente unificado de navegación: TopBar + Drawer (tablet/mobile) + Desktop Sidebar */}
      <AppSidebar
        user={user}
        isTestMode={isTestMode}
        isMobileOpen={isMobileOpen}
        onOpenMobile={() => setIsMobileOpen(true)}
        onCloseMobile={() => setIsMobileOpen(false)}
        isDesktopCollapsed={isDesktopCollapsed}
        onToggleDesktopCollapse={() => setIsDesktopCollapsed((v) => !v)}
      />

      {/* Contenido principal: en tablet y mobile tiene pl-0 para aprovechar el 100% de la pantalla.
          En desktop tiene lg:pl-72 (o lg:pl-0 si el usuario decide colapsarlo) */}
      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 pb-16 md:pb-8 ${
          isDesktopCollapsed ? "lg:pl-0" : "lg:pl-72"
        }`}
      >
        <div className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
