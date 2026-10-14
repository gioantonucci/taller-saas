"use client";

import React from "react";
import Link from "next/link";
import { Wrench, MapPin, Phone, Mail, Clock, ShieldCheck } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function Footer() {
  const { settings } = useTenantSettings();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Columna 1: Marca White-Label */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                {settings.tallerNombre || "Taller Mecánico Central Pro"}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.descripcion ||
                "Servicio integral del automotor, inyección electrónica, mecánica general y diagnóstico computarizado con tecnología de punta."}
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Garantía Oficial en Repuestos y Mano de Obra</span>
            </div>
          </div>

          {/* Columna 2: Navegación Rápida */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Navegación</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Servicios Mecánicos Especializados
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-white transition-colors">
                  Ubicación y Contacto
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Portal Operativo del Taller (Login)
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Horarios de Atención Dinámicos */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Horarios de Taller
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  {settings.horarios ||
                    "Lunes a Viernes: 08:00 a 19:00 hs | Sábados: 08:30 a 13:00 hs"}
                </span>
              </div>
              <p className="text-slate-500 italic text-[11px] pt-1">
                Atención con turno previo y guardia para emergencias mecánicas.
              </p>
            </div>
          </div>

          {/* Columna 4: Contacto y Dirección Dinámica */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Ubicación y WhatsApp
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{settings.direccion || "Av. del Libertador 4580, Buenos Aires"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${(settings.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors font-semibold"
                >
                  WhatsApp: {settings.whatsapp || "+54 9 11 4567-8900"}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{settings.email || "contacto@tallerpro.com"}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} {settings.tallerNombre || "Taller Central Pro"}. Todos los
            derechos reservados.
          </p>
          <p className="text-[11px] text-slate-600">
            Powered by AutoTaller SaaS Platform • White-Label Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
