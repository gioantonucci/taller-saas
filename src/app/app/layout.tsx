import React from "react";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
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

  return (
    <AppShell user={session} isTestMode={isTestMode}>
      <SparePartReminderGlobal user={session} />
      {children}
    </AppShell>
  );
}
