"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  ArrowRight,
} from "lucide-react";

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tallerNombre: "",
    whatsapp: "",
    logoUrl: "",
    direccion: "",
    horarios: "",
    email: "",
    descripcion: "",
    valorHoraManoDeObra: 15000,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setFormData({
            tallerNombre: data.settings.tallerNombre || "POGGI Taller Integral",
            whatsapp: data.settings.whatsapp || "+34 656 40 62 86",
            logoUrl: data.settings.logoUrl || "/images/poggi/logo.png",
            direccion: data.settings.direccion || "C. de Sant Pius X, 13, 46017 València, España",
            horarios: data.settings.horarios || "Lunes a viernes · 08:00–18:00",
            email: data.settings.email || "poggitallerintegral@gmail.com",
            descripcion:
              data.settings.descripcion ||
              "Más de 30 años cuidando tu vehículo en Valencia. Mecánica general, diagnóstico electrónico de precisión, electricidad y climatización.",
            valorHoraManoDeObra: data.settings.valorHoraManoDeObra || 45,
          });
        }
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
      setErrorMsg("No se pudieron cargar los ajustes actuales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tallerNombre: formData.tallerNombre,
          whatsapp: formData.whatsapp,
          logoUrl: formData.logoUrl,
          direccion: formData.direccion,
          horarios: formData.horarios,
          email: formData.email,
          descripcion: formData.descripcion,
          valorHoraManoDeObra: parseFloat(formData.valorHoraManoDeObra.toString()) || 15000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar ajustes");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      console.error("Error al guardar ajustes:", err);
      setErrorMsg(err.message || "Error al actualizar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Módulo de Configuración
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Configuración
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Los datos guardados aquí impactan dinámicamente en la Web Pública (Landing, Contacto, Servicios), el Botón Flotante de WhatsApp y las Actas Legales en PDF.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ajustes guardados con éxito</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Banner de Acceso Rápido a Personal */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white p-5 rounded-3xl border border-purple-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Personal del Taller (Mecánicos y Recepción)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea nuevas cuentas de acceso y gestiona las altas o bajas del personal operativo.
            </p>
          </div>
        </div>

        <Link
          href="/app/admin/personal"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <span>Gestionar Personal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección 1: Identidad del Taller y White-Label */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Identidad de Marca y Membrete
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Taller (TallerNombre) *
              </label>
              <input
                type="text"
                required
                value={formData.tallerNombre}
                onChange={(e) => setFormData({ ...formData, tallerNombre: e.target.value })}
                placeholder="Ej: POGGI Taller Integral"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Aparece en la barra de navegación, actas y portal de clientes.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Oficial del Taller *
              </label>
              <input
                type="text"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="Ej: +34 656 40 62 86"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Utilizado para el botón flotante y comunicación directa con clientes.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico de Contacto
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="poggitallerintegral@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                URL del Logo del Taller (Opcional)
              </label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="/logo.png o URL externa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dirección Física del Taller
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Ej: Av. del Libertador 4580, Buenos Aires"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Horarios de Atención
            </label>
            <input
              type="text"
              value={formData.horarios}
              onChange={(e) => setFormData({ ...formData, horarios: e.target.value })}
              placeholder="Ej: Lunes a Viernes: 08:00 a 19:00 | Sábados: 08:30 a 13:00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción Institucional (Landing Page y Footer)
            </label>
            <textarea
              rows={2}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Breve reseña de los servicios del taller..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>
        </div>



        {/* Botón Guardar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando configuración...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios de Configuración</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
