"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { settings } = useTenantSettings();

  const phone = settings.whatsapp || "+34 656 40 62 86";
  const cleanPhone = phone.replace(/\D/g, "");

  const navLinks = [
    { href: "/#servicios", label: "Servicios" },
    { href: "/#especializacion", label: "Especialización" },
    { href: "/#trabajos", label: "Trabajos" },
    { href: "/#ubicacion", label: "Ubicación" },
    { href: "/estado", label: "Seguimiento" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur-md border-b border-neutral-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6 sm:py-7 min-h-[92px]">
          {/* Logo POGGI TALLER INTEGRAL con Isotipo */}
          <Link href="/" className="flex items-center gap-3 group py-1">
            <img
              src="/images/poggi/logo.png"
              alt="Logo POGGI Taller Integral"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white">
              <span className="text-[#e5242b]">POGGI</span> TALLER INTEGRAL
            </span>
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="py-2 text-xs sm:text-[13px] font-black uppercase tracking-wider text-neutral-300 hover:text-[#e5242b] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Botones de Acción Desktop */}
          <div className="hidden md:flex items-center gap-3.5">
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                "Hola POGGI Taller Integral, quisiera consultar por mi vehículo."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <span>WhatsApp</span>
            </a>

            <Link
              href="/login"
              className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 hover:border-neutral-500 px-4 py-3 rounded-xl transition-all"
              title="Portal de Operaciones del Taller"
            >
              <User className="w-3.5 h-3.5" />
              <span>Staff</span>
            </Link>
          </div>

          {/* Botón Mobile Menu */}
          <div className="flex lg:hidden items-center gap-2.5">
            <Link
              href="/login"
              className="text-xs font-bold text-neutral-300 bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-xl"
            >
              Staff
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-neutral-300 hover:text-white focus:outline-none rounded-xl hover:bg-neutral-800"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu desplegable en Mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-800 bg-[#0c0c0c] px-4 pt-4 pb-7 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-sm font-bold uppercase tracking-wider text-neutral-200 hover:text-[#e5242b]"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-neutral-800 flex flex-col gap-2.5">
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                "Hola POGGI Taller Integral, quisiera consultar por mi vehículo."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 font-bold text-white bg-[#25D366] rounded-xl uppercase tracking-wider text-xs"
            >
              WhatsApp Directo
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 font-bold text-neutral-300 bg-neutral-800 rounded-xl text-xs"
            >
              Acceso Staff / Plataforma
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
