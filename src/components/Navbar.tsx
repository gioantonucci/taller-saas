"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, Phone, Menu, X } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { settings } = useTenantSettings();

  const navLinks = [
    { href: "/", label: "Inicio" },
    { href: "/servicios", label: "Servicios" },
    { href: "/estado", label: "Seguimiento de Auto" },
    { href: "/contacto", label: "Ubicación y Turnos" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y Nombre White-Label */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/20">
              {settings.logoUrl && settings.logoUrl !== "/logo.png" ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.tallerNombre}
                  className="w-7 h-7 object-contain rounded-lg"
                />
              ) : (
                <Wrench className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-tight">
                {settings.tallerNombre || "Taller Mecánico Pro"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase block">
                Servicio Integral Automotor
              </span>
            </div>
          </Link>

          {/* Nav Links Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-sky-600 border-b-2 border-sky-600 pb-1"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA y Teléfono Dinámico */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={`https://wa.me/${(settings.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{settings.whatsapp || "+54 9 11 4567-8900"}</span>
            </a>

            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 px-3 py-1.5 rounded-xl transition-all"
            >
              <span>Acceso Personal</span>
            </Link>
          </div>

          {/* Botón Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg"
            >
              Staff
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu desplegable en Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-sky-600"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <a
              href={`https://wa.me/${(settings.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-sky-600" />
              <span>{settings.whatsapp || "+54 9 11 4567-8900"}</span>
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 font-bold text-white bg-sky-600 rounded-xl"
            >
              Entrar a la Plataforma SaaS
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
