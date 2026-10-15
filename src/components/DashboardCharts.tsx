"use client";

import React from "react";
import Link from "next/link";
import {
  Car,
  ChevronRight,
  Wrench,
} from "lucide-react";

interface GraficoAutoItem {
  periodo: string;
  ingresados: number;
  entregados: number;
}

interface MecanicoMonitorItem {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  horasHoy: number;
  ordenActiva: {
    id: string;
    numeroOrden: number;
    estado: string;
    vehiculo: string;
    patente: string;
    cliente: string;
    detalles: string;
  } | null;
  ultimaTarea: string;
}

interface DashboardChartsProps {
  graficoAutos: GraficoAutoItem[];
  monitorMecanicos: MecanicoMonitorItem[];
}

export default function DashboardCharts({
  graficoAutos = [],
  monitorMecanicos = [],
}: DashboardChartsProps) {
  // Totales para gráfico de autos
  const totalIngresadosMes = graficoAutos.reduce((acc, it) => acc + it.ingresados, 0);
  const totalEntregadosMes = graficoAutos.reduce((acc, it) => acc + it.entregados, 0);

  // Escalar barras para gráficos
  const maxAutos = Math.max(...graficoAutos.map((g) => Math.max(g.ingresados, g.entregados)), 6);

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: PANELES VISUALES DE GRÁFICOS (ADMIN) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                Panel Operativo del Dueño
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              Flujo Operativo de Vehículos en Taller
            </h2>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-sky-600" />
              <span>Autos: Ingresos vs Entregas</span>
            </span>
          </div>
        </div>

        {/* GRÁFICO: AUTOS INGRESADOS VS ENTREGADOS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-sky-500 shrink-0" />
                <span className="text-slate-700 font-semibold">Ingresados ({totalIngresadosMes})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                <span className="text-slate-700 font-semibold">Entregados ({totalEntregadosMes})</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Período: Mes Actual en Curso</span>
          </div>

          {/* Grilla visual de barras con scroll horizontal seguro en mobile */}
          <div className="overflow-x-auto no-scrollbar pb-1">
            <div className="h-64 pt-6 pb-2 flex items-end justify-between gap-3 border-b border-slate-100 px-1 sm:px-6 min-w-[300px]">
              {graficoAutos.map((item, idx) => {
                const heightIngresados = Math.round((item.ingresados / maxAutos) * 180);
                const heightEntregados = Math.round((item.entregados / maxAutos) * 180);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-48">
                      {/* Barra Ingresados */}
                      <div className="w-6 sm:w-10 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-sky-600 opacity-80 group-hover:opacity-100">
                          {item.ingresados}
                        </span>
                        <div
                          style={{ height: `${Math.max(heightIngresados, 12)}px` }}
                          className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-xl transition-all duration-500 shadow-sm group-hover:brightness-110"
                        />
                      </div>

                      {/* Barra Entregados */}
                      <div className="w-6 sm:w-10 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-emerald-600 opacity-80 group-hover:opacity-100">
                          {item.entregados}
                        </span>
                        <div
                          style={{ height: `${Math.max(heightEntregados, 12)}px` }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl transition-all duration-500 shadow-sm group-hover:brightness-110"
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 mt-1">{item.periodo}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen del Gráfico de Autos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2 text-xs">
            <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-100">
              <span className="text-[10px] uppercase font-bold text-sky-700 block">Total Recepcionados</span>
              <p className="text-xl font-black text-sky-950 mt-0.5">{totalIngresadosMes} vehículos</p>
            </div>
            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Entregados / OK</span>
              <p className="text-xl font-black text-emerald-950 mt-0.5">{totalEntregadosMes} reparaciones</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Tasa de Rotación</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {totalIngresadosMes > 0 ? `${Math.round((totalEntregadosMes / totalIngresadosMes) * 100)}%` : "0%"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: MONITOR DE MECÁNICOS EN TIEMPO REAL */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Monitor de Mecánicos en Bahía
              </h2>
              <p className="text-xs text-slate-500">
                Seguimiento en vivo de órdenes activas y tareas del turno.
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{monitorMecanicos.length} mecánicos de turno</span>
          </span>
        </div>

        {monitorMecanicos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No hay mecánicos registrados en el sistema actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitorMecanicos.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
              >
                {/* Cabecera del Mecánico */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                      {m.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{m.nombre}</h3>
                      <span className="text-[10px] text-slate-400 block truncate">{m.email}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Activo
                  </span>
                </div>

                {/* Orden de Trabajo Actual */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Trabajo Actual en Bahía:
                  </span>

                  {m.ordenActiva ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/app/ordenes/${m.ordenActiva.id}`}
                          className="font-mono font-extrabold text-sky-600 hover:underline flex items-center gap-1"
                        >
                          <span>Orden #{m.ordenActiva.numeroOrden}</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                        <span className="font-mono font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                          {m.ordenActiva.patente}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 mt-1 truncate">
                        {m.ordenActiva.vehiculo}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Cliente: {m.ordenActiva.cliente}
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic py-1">
                      Sin orden activa asignada en este momento
                    </div>
                  )}
                </div>

                {/* Última Tarea y Horas */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Horas trabajadas hoy:</span>
                    <span className="font-extrabold text-slate-900 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                      {m.horasHoy} hs registradas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate italic">
                    Última tarea: &quot;{m.ultimaTarea}&quot;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
