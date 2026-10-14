"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Car,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { getStatusInfo } from "@/lib/order-status";

export default function MonitoreoVivoPage() {
  const [monitoring, setMonitoring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchMonitoring = async () => {
    try {
      const res = await fetch("/api/monitoring");
      if (res.ok) {
        const data = await res.json();
        setMonitoring(data.monitoring || []);
        setLastRefreshed(new Date());
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || "No autorizado para ver el monitoreo en vivo");
      }
    } catch (err) {
      setError("Error de conexión al cargar monitoreo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
    // Auto-refresco cada 15 segundos
    const interval = setInterval(fetchMonitoring, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
        <p className="font-bold text-sm mb-1">Acceso Restringido</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Monitoreo de Mecánicos en Vivo
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Seguimiento en tiempo real de operaciones en el taller, vehículos asignados y productividad diaria.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Actualizado: {lastRefreshed.toLocaleTimeString("es-AR")}
          </span>
          <button
            onClick={fetchMonitoring}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Grid de Mecánicos en el Taller */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {monitoring.map((item) => {
          const isWorking = item.statusText === "EN_REPARACION" || item.statusText === "TRABAJANDO_EN_VIVO";
          const isPaused = item.statusText === "EN_ESPERA_REPUESTOS" || item.statusText === "ESPERANDO_REPUESTOS";
          const isPendingInspection = item.statusText === "PENDIENTE_PERITAJE" || item.statusText === "PENDIENTE";

          return (
            <div
              key={item.mechanic.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm transition-all ${
                isWorking
                  ? "border-blue-300 ring-2 ring-blue-500/10"
                  : isPaused
                  ? "border-amber-300 ring-2 ring-amber-500/10"
                  : isPendingInspection
                  ? "border-rose-300 ring-2 ring-rose-500/10"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                      isWorking
                        ? "bg-blue-600 shadow-blue-600/20"
                        : isPaused
                        ? "bg-amber-500 shadow-amber-500/20"
                        : isPendingInspection
                        ? "bg-rose-500 shadow-rose-500/20"
                        : "bg-slate-700 shadow-slate-700/20"
                    }`}
                  >
                    {item.mechanic.nombre[0]}
                    {item.mechanic.apellido[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {item.mechanic.nombre} {item.mechanic.apellido}
                    </h3>
                    <span className="text-xs text-slate-400">{item.mechanic.email}</span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${item.statusBadge}`}
                >
                  {isWorking && <PlayCircle className="w-3.5 h-3.5 text-blue-600" />}
                  {isPaused && <PauseCircle className="w-3.5 h-3.5 text-amber-600" />}
                  {isPendingInspection && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                  <span>
                    {item.statusText === "DISPONIBLE"
                      ? "Disponible"
                      : getStatusInfo(item.statusText).shortLabel}
                  </span>
                </span>
              </div>

              {/* Vehículo Activo Actual */}
              <div className="py-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Vehículo en Atención Actual:
                </span>
                {item.activeOrder ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-sky-600" />
                        <span className="font-bold text-xs text-slate-900">
                          {item.activeOrder.marcaModelo}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-300">
                          {item.activeOrder.patente}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                            getStatusInfo(item.activeOrder.estado).badgeClass
                          }`}
                        >
                          {getStatusInfo(item.activeOrder.estado).label}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/app/ordenes/${item.activeOrder.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-white hover:bg-sky-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0"
                    >
                      <span>Orden #{item.activeOrder.numeroOrden}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    Sin vehículo asignado en este momento (Disponible)
                  </div>
                )}
              </div>

              {/* Métricas de hoy */}
              <div className="grid grid-cols-2 gap-3 pt-2 pb-3 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Horas cargadas hoy</span>
                  <span className="text-base font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{item.totalHoursToday.toFixed(1)} hs</span>
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Tareas registradas</span>
                  <span className="text-base font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{item.todayLogsCount} tareas</span>
                  </span>
                </div>
              </div>

              {/* Última tarea registrada */}
              <div className="pt-2 text-xs">
                <span className="text-slate-400 block text-[11px]">Última actividad:</span>
                <p className="text-slate-700 font-medium italic mt-0.5">
                  &ldquo;{item.lastTask}&rdquo;
                </p>
                {item.lastLogTime && (
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Registrado a las {new Date(item.lastLogTime).toLocaleTimeString("es-AR")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
