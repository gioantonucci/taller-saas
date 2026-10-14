import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
