import React from "react";
import { getSession, normalizeRole } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import InactivityHandler from "@/components/InactivityHandler";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Si no hay sesión (por ejemplo en /app/login), renderizar directamente
  if (!session) {
    return <>{children}</>;
  }

  const isMechanic = normalizeRole(session.role) === "MECHANIC";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <InactivityHandler />
      <AppSidebar user={session} />

      {/* Contenido principal: en mobile se reduce el padding inferior para mecánicos al no tener barra inferior flotante */}
      <main
        className={`flex-1 md:pl-64 lg:pl-72 flex flex-col min-w-0 ${
          isMechanic ? "pb-6" : "pb-20"
        } md:pb-8`}
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
