"use client";

import React from "react";
import { MessageCircle } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function WhatsAppButton() {
  const { settings } = useTenantSettings();

  // Limpiar número para la URL de WhatsApp (eliminar espacios, guiones y signos)
  const cleanNumber = (settings.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "");
  const defaultText = encodeURIComponent(
    `¡Hola ${settings.tallerNombre}! Quisiera consultar disponibilidad para traer mi vehículo a revisión técnica / presupuesto.`
  );
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${defaultText}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Contactar por WhatsApp a ${settings.tallerNombre}`}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
    >
      <div className="relative">
        <MessageCircle className="w-6 h-6 fill-current animate-pulse group-hover:animate-none" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </div>
      <span className="font-semibold text-sm hidden sm:inline">WhatsApp Taller</span>
    </a>
  );
}
