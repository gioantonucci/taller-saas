"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Menu, X, User } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { settings } = useTenantSettings();

  const phone = settings.whatsapp || "+34 656 40 62 86";
  const cleanPhone = phone.replace(/\D/g, "");

  const navLinks = [
    { href: "/#nosotros", label: "Nosotros" },
    { href: "/#servicios", label: "Servicios" },
    { href: "/#especializacion", label: "Especialización" },
    { href: "/#trabajos", label: "Trabajos" },
    { href: "/#ubicacion", label: "Ubicación" },
    { href: "/estado", label: "Seguimiento" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-neutral-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo POGGI TALLER INTEGRAL */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-black tracking-wider uppercase text-white">
              <span className="text-[#e5242b]">POGGI</span> TALLER INTEGRAL
            </span>
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-black uppercase tracking-wider text-neutral-300 hover:text-[#e5242b] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Botones de Acción Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#e5242b]" />
              <span>{phone}</span>
            </a>

            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                "Hola POGGI Taller Integral, quisiera consultar por un turno / presupuesto para mi vehículo."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-md flex items-center gap-1.5"
            >
              <span>WhatsApp</span>
            </a>

            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-700 hover:border-neutral-500 px-3 py-2 rounded-md transition-all"
              title="Portal de Operaciones del Taller"
            >
              <User className="w-3.5 h-3.5" />
              <span>Staff</span>
            </Link>
          </div>

          {/* Botón Mobile Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-bold text-neutral-300 bg-neutral-900 border border-neutral-700 px-2.5 py-1.5 rounded-md"
            >
              Staff
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-300 hover:text-white focus:outline-none"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu desplegable en Mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-800 bg-[#0c0c0c] px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold uppercase tracking-wider text-neutral-200 hover:text-[#e5242b]"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-neutral-800 flex flex-col gap-2">
            <a
              href={`tel:${phone}`}
              className="w-full text-center py-2.5 font-bold text-neutral-200 bg-neutral-900 rounded-lg flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-[#e5242b]" />
              <span>{phone}</span>
            </a>
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                "Hola POGGI Taller Integral, quisiera consultar por un turno / presupuesto para mi vehículo."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 font-bold text-white bg-[#25D366] rounded-lg uppercase tracking-wider text-xs"
            >
              WhatsApp Directo
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 font-bold text-neutral-300 bg-neutral-800 rounded-lg text-xs"
            >
              Acceso Staff / Plataforma
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
