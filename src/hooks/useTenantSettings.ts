"use client";

import { useState, useEffect } from "react";

export interface TenantSettingsData {
  id: string;
  tallerNombre: string;
  whatsapp: string;
  logoUrl?: string | null;
  direccion?: string | null;
  horarios?: string | null;
  email?: string | null;
  descripcion?: string | null;
  valorHoraManoDeObra: number;
}

const defaultSettings: TenantSettingsData = {
  id: "default",
  tallerNombre: "Taller Mecánico Central Pro",
  whatsapp: "+54 9 11 4567-8900",
  logoUrl: "/logo.png",
  direccion: "Av. del Libertador 4580, Buenos Aires",
  horarios: "Lunes a Viernes: 08:00 a 19:00 | Sábados: 08:30 a 13:00",
  email: "contacto@tallerpro.com",
  descripcion:
    "Servicio integral del automotor, inyección electrónica, mecánica general y diagnóstico computarizado de última generación.",
  valorHoraManoDeObra: 15000,
};

export function useTenantSettings() {
  const [settings, setSettings] = useState<TenantSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch settings");
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch tenant settings, using fallback:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, loading };
}
