import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taller Central Pro | Sistema SaaS de Gestión Automotor",
  description:
    "Plataforma SaaS líder para digitalización integral de talleres mecánicos. Gestión de repuestos con OCR, peritaje fotográfico en la nube y auditoría en tiempo real.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
