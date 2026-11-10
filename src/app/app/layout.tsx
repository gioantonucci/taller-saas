import React from "react";
import { cookies } from "next/headers";
import { getSession, normalizeRole } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import InactivityHandler from "@/components/InactivityHandler";
import SparePartReminderGlobal from "@/components/SparePartReminderGlobal";

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

  const cookieStore = cookies();
  const isTestMode =
    session.email?.toLowerCase() === "test@test.com" ||
    cookieStore.get("poggi_test_mode")?.value === "1";

  const isMechanic = normalizeRole(session.role) === "MECHANIC";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <InactivityHandler />
      <AppSidebar user={session} isTestMode={isTestMode} />

      {/* Contenido principal con padding inferior en mobile para no tapar con la barra de navegación */}
      <main className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-w-0 pb-20 md:pb-8">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <SparePartReminderGlobal user={session} />
          {children}
        </div>
      </main>
    </div>
  );
}
