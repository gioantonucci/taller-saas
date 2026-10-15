import type { Metadata } from "next";
import { Suspense } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import { AppDialogProvider } from "@/components/AppDialog";
import "./globals.css";

export const metadata: Metadata = {
  title: "POGGI TALLER INTEGRAL | Taller de Automoción en Valencia",
  description:
    "Más de 30 años cuidando tu vehículo en Valencia. Mecánica general, diagnosis electrónica avanzada, electricidad, neumáticos, climatización y mantenimiento integral.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-50 text-slate-900">
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <AppDialogProvider>
          {children}
        </AppDialogProvider>
      </body>
    </html>
  );
}
