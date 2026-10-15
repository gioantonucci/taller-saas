"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function Footer() {
  const { settings } = useTenantSettings();
  const pathname = usePathname();

  const phone = settings.whatsapp || "+34 656 40 62 86";
  const address = settings.direccion || "C. de Sant Pius X, 13, 46017 València, España";
  const email = settings.email || "poggitallerintegral@gmail.com";
  const hours = settings.horarios || "Lunes a viernes · 08:00–18:00";

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/#")) {
      const targetId = href.replace("/#", "");
      if (pathname === "/") {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", href);
        }
      }
    }
  };

  return (
    <footer className="bg-[#050505] text-neutral-300 pt-16 pb-20 md:pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-800">
          {/* Columna 1: Marca POGGI */}
          <div className="md:col-span-1 space-y-4">
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  window.history.pushState(null, "", "/");
                }
              }}
              className="flex items-center gap-3"
            >
              <img
                src="/images/poggi/logo.png"
                alt="Logo POGGI Taller Integral"
                className="h-10 w-auto object-contain drop-shadow"
              />
              <span className="text-lg font-black tracking-wider uppercase text-white">
                <span className="text-[#e5242b]">POGGI</span> TALLER INTEGRAL
              </span>
            </Link>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Más de 30 años cuidando tu vehículo en Valencia. Mecánica general, diagnóstico electrónico de precisión, electricidad y climatización.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#e5242b]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="font-bold">Profesionalidad y Confianza en cada trabajo</span>
            </div>
          </div>

          {/* Columna 2: Navegación */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li>
                <Link
                  href="/#servicios"
                  onClick={(e) => handleNavClick(e, "/#servicios")}
                  className="hover:text-white transition-colors"
                >
                  Nuestros servicios
                </Link>
              </li>
              <li>
                <Link
                  href="/#especializacion"
                  onClick={(e) => handleNavClick(e, "/#especializacion")}
                  className="hover:text-white transition-colors"
                >
                  Especialización Electrónica
                </Link>
              </li>
              <li>
                <Link
                  href="/#trabajos"
                  onClick={(e) => handleNavClick(e, "/#trabajos")}
                  className="hover:text-white transition-colors"
                >
                  Trabajos realizados
                </Link>
              </li>
              <li>
                <Link
                  href="/#ubicacion"
                  onClick={(e) => handleNavClick(e, "/#ubicacion")}
                  className="hover:text-white transition-colors"
                >
                  Ubicación en Valencia
                </Link>
              </li>
              <li>
                <Link href="/estado" className="hover:text-white transition-colors font-bold text-neutral-200">
                  Seguimiento de Coche en Vivo
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Horarios */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">
              Horario de Taller
            </h4>
            <div className="space-y-2 text-xs text-neutral-400">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#e5242b] shrink-0 mt-0.5" />
                <span>{hours}</span>
              </div>
              <p className="text-neutral-500 text-[11px] pt-1">
                Consultas directas por WhatsApp y teléfono.
              </p>
            </div>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">
              Contacto y Ubicación
            </h4>
            <ul className="space-y-3 text-xs text-neutral-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#e5242b] shrink-0 mt-0.5" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#e5242b] shrink-0" />
                <a
                  href={`tel:${phone}`}
                  className="hover:text-white transition-colors font-semibold"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#e5242b] shrink-0" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-white transition-colors"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© {new Date().getFullYear()} POGGI Taller Integral · C. de Sant Pius X, 13 · València</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/login" className="hover:text-neutral-300 transition-colors">
              Acceso Staff
            </Link>
            <span>•</span>
            <Link href="/estado" className="hover:text-neutral-300 transition-colors">
              Consulta de Reparaciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
