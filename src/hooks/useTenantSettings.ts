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
  tallerNombre: "POGGI Taller Integral",
  whatsapp: "+34 656 40 62 86",
  logoUrl: "/logo.png",
  direccion: "C. de Sant Pius X, 13, 46017 València, España",
  horarios: "Lunes a viernes: 08:00 a 18:00",
  email: "poggitallerintegral@gmail.com",
  descripcion:
    "Más de 30 años cuidando tu vehículo en Valencia. Mantenimiento, diagnóstico, reparación y electrónica automotriz con experiencia, tecnología y atención personalizada.",
  valorHoraManoDeObra: 45,
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
