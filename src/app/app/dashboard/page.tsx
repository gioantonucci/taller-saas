"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  ChevronRight,
  Wrench,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import { getStatusInfo } from "@/lib/order-status";
import DashboardCharts from "@/components/DashboardCharts";

interface MetricsData {
  activosEnTaller: number;
  totalIngresados: number;
  finalizados: number;
  estadoCounts: {
    PENDIENTE_PERITAJE?: number;
    EN_REPARACION?: number;
    EN_ESPERA_REPUESTOS?: number;
    FINALIZADO: number;
    ENTREGADO?: number;
    PENDIENTE?: number;
    EN_CURSO?: number;
    ESPERANDO_REPUESTOS?: number;
  };
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [graficoAutos, setGraficoAutos] = useState<any[]>([]);
  const [monitorMecanicos, setMonitorMecanicos] = useState<any[]>([]);
  const [ultimasOrdenes, setUltimasOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para Nueva Orden Rápida
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState({
    clienteNombre: "",
    clienteApellido: "",
    clienteTelefono: "",
    clienteDni: "",
    clienteEmail: "",
    clienteDireccion: "",
    vehiculoPatente: "",
    vehiculoMarca: "",
    vehiculoModelo: "",
    vehiculoAnio: new Date().getFullYear().toString(),
    vehiculoColor: "",
    nivelNafta: "1/2",
    kilometraje: "",
    detallesIngreso: "",
    comentariosDuenio: "",
    costoManoDeObra: "50000",
  });

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setGraficoAutos(data.graficoAutos || []);
        setMonitorMecanicos(data.monitorMecanicos || []);
        setUltimasOrdenes(data.ultimasOrdenes);
      }
    } catch (err) {
      console.error("Error al cargar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Error al crear orden");
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      // Reset form
      setOrderForm({
        clienteNombre: "",
        clienteApellido: "",
        clienteTelefono: "",
        clienteDni: "",
        clienteEmail: "",
        clienteDireccion: "",
        vehiculoPatente: "",
        vehiculoMarca: "",
        vehiculoModelo: "",
        vehiculoAnio: new Date().getFullYear().toString(),
        vehiculoColor: "",
        nivelNafta: "1/2",
        kilometraje: "",
        detallesIngreso: "",
        comentariosDuenio: "",
        costoManoDeObra: "50000",
      });
      fetchDashboardData();
    } catch (err) {
      setFormError("Error de conexión al crear orden");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header del Dashboard Unificado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Módulo de Gestión
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Dashboard
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Métricas operativas del taller, rotación de vehículos y seguimiento en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ingreso Rápido de Vehículo</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS: Grid 2x2 en mobile, 4 cols en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Activos en Taller */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate pr-1">En Taller Hoy</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {metrics?.activosEnTaller || 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            Vehículos activos
          </p>
        </div>

        {/* Ingresados vs Entregados */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate pr-1">Ingresos / Listos</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {metrics?.totalIngresados || 0} / {metrics?.finalizados || 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-1 truncate">
            {metrics?.finalizados || 0} finalizados
          </p>
        </div>

        {/* En Pausa / Repuestos */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate pr-1">En Pausa</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {metrics?.estadoCounts.EN_ESPERA_REPUESTOS ?? metrics?.estadoCounts.ESPERANDO_REPUESTOS ?? 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            Esperando piezas
          </p>
        </div>

        {/* Mecánicos de Turno */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate pr-1">Mecánicos</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {monitorMecanicos.length}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            Técnicos operativos
          </p>
        </div>
      </div>

      {/* ESTADO DEL FLUJO DE TRABAJO: Swipeable horizontal en mobile, 5 cols en desktop */}
      <div className="flex sm:grid sm:grid-cols-5 gap-2.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
        <div className="min-w-[125px] flex-1 shrink-0 bg-rose-50/70 p-3 sm:p-3.5 rounded-2xl border border-rose-200">
          <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">En Peritaje</div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-900 mt-0.5">
            {metrics?.estadoCounts.PENDIENTE_PERITAJE ?? metrics?.estadoCounts.PENDIENTE ?? 0}
          </div>
        </div>

        <div className="min-w-[125px] flex-1 shrink-0 bg-blue-50/70 p-3 sm:p-3.5 rounded-2xl border border-blue-200">
          <div className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">En Reparación</div>
          <div className="text-lg sm:text-xl font-extrabold text-blue-900 mt-0.5">
            {metrics?.estadoCounts.EN_REPARACION ?? metrics?.estadoCounts.EN_CURSO ?? 0}
          </div>
        </div>

        <div className="min-w-[125px] flex-1 shrink-0 bg-amber-50/70 p-3 sm:p-3.5 rounded-2xl border border-amber-200">
          <div className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">En Pausa</div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-900 mt-0.5">
            {metrics?.estadoCounts.EN_ESPERA_REPUESTOS ?? metrics?.estadoCounts.ESPERANDO_REPUESTOS ?? 0}
          </div>
        </div>

        <div className="min-w-[125px] flex-1 shrink-0 bg-emerald-50/70 p-3 sm:p-3.5 rounded-2xl border border-emerald-200">
          <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Listo</div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-900 mt-0.5">
            {metrics?.estadoCounts.FINALIZADO || 0}
          </div>
        </div>

        <div className="min-w-[125px] flex-1 shrink-0 bg-slate-100 p-3 sm:p-3.5 rounded-2xl border border-slate-300">
          <div className="text-[11px] text-slate-700 font-bold uppercase tracking-wider">Entregado</div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics?.estadoCounts.ENTREGADO ?? 0}
          </div>
        </div>
      </div>

      {/* GRÁFICOS VISUALES Y MONITOR DE MECÁNICOS (ADMIN / DUEÑO) */}
      <DashboardCharts
        graficoAutos={graficoAutos}
        monitorMecanicos={monitorMecanicos}
      />

      {/* TABLA DE ÓRDENES RECIENTES */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Órdenes de Trabajo Recientes</h2>
            <p className="text-xs text-slate-500">Últimos vehículos ingresados a la plataforma</p>
          </div>
          <Link
            href="/app/ordenes"
            className="text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Ver todas las órdenes</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* VISTA MOBILE: Tarjetas Responsivas */}
        <div className="md:hidden divide-y divide-slate-100">
          {ultimasOrdenes.map((orden) => {
            const statusInfo = getStatusInfo(orden.estado);

            return (
              <div key={orden.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/ordenes/${orden.id}`}
                      className="font-bold text-slate-900 hover:text-sky-600 text-sm"
                    >
                      Orden #{orden.numeroOrden}
                    </Link>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 border border-slate-200">
                      {orden.vehicle.patente}
                    </span>
                  </div>

                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 ${statusInfo.badgeClass}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <Link
                    href={`/app/vehiculos/${orden.vehicle.patente}`}
                    className="font-bold text-slate-900 hover:text-sky-600 text-sm sm:text-base block"
                  >
                    {orden.vehicle.marca} {orden.vehicle.modelo}
                  </Link>

                  <div className="flex items-center justify-between text-slate-500 pt-0.5">
                    <Link
                      href={`/app/clientes/${orden.vehicle.client.id}`}
                      className="hover:text-sky-600 truncate max-w-[200px] font-medium"
                    >
                      {orden.vehicle.client.nombre} {orden.vehicle.client.apellido}
                    </Link>

                    {orden.mechanic ? (
                      <span className="flex items-center gap-1 font-medium text-slate-700 shrink-0">
                        <Wrench className="w-3.5 h-3.5 text-sky-600" />
                        <span>{orden.mechanic.nombre}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic shrink-0">Sin asignar</span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/app/ordenes/${orden.id}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Ver Detalle de Orden</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* VISTA DESKTOP: Tabla con Min-Width */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Vehículo y Patente</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Mecánico Asignado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {ultimasOrdenes.map((orden) => {
                const statusInfo = getStatusInfo(orden.estado);

                return (
                  <tr key={orden.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <Link href={`/app/ordenes/${orden.id}`} className="hover:text-sky-600">
                        #{orden.numeroOrden}
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <Link
                        href={`/app/vehiculos/${orden.vehicle.patente}`}
                        className="font-semibold text-slate-800 hover:text-sky-600 block"
                      >
                        {orden.vehicle.marca} {orden.vehicle.modelo}
                      </Link>
                      <span className="inline-block mt-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                        {orden.vehicle.patente}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <Link
                        href={`/app/clientes/${orden.vehicle.client.id}`}
                        className="hover:text-sky-600"
                      >
                        {orden.vehicle.client.nombre} {orden.vehicle.client.apellido}
                      </Link>
                      <span className="block text-[11px] text-slate-400">
                        DNI {orden.vehicle.client.dni}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {orden.mechanic ? (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Wrench className="w-3.5 h-3.5 text-sky-600" />
                          <span>{orden.mechanic.nombre} {orden.mechanic.apellido}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin asignar</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/app/ordenes/${orden.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <span>Detalle</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INGRESO RÁPIDO DE VEHÍCULO (CLIENTE DNI + PATENTE) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Apertura Rápida de Orden de Trabajo</h3>
                <p className="text-xs text-slate-500">
                  Ingreso por DNI y Patente. Si no existen en la base de datos, se darán de alta automáticamente.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-5 mt-5">
              {/* Sección 1: Cliente */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>1. Datos del Cliente</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Juan"
                      value={orderForm.clienteNombre}
                      onChange={(e) => setOrderForm({ ...orderForm, clienteNombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Apellido <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pérez"
                      value={orderForm.clienteApellido}
                      onChange={(e) => setOrderForm({ ...orderForm, clienteApellido: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Teléfono / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: +54 11 4455-6677"
                      value={orderForm.clienteTelefono}
                      onChange={(e) => setOrderForm({ ...orderForm, clienteTelefono: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      CUIL / DNI <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 20-34890123-8 o 34890123"
                      value={orderForm.clienteDni}
                      onChange={(e) => setOrderForm({ ...orderForm, clienteDni: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dirección / Domicilio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Av. San Martín 1234, CABA"
                      value={orderForm.clienteDireccion}
                      onChange={(e) => setOrderForm({ ...orderForm, clienteDireccion: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email (Correo Electrónico)
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={orderForm.clienteEmail}
                      onChange={(e) => setOrderForm({ ...orderForm, clienteEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Vehículo */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-3 flex items-center gap-1.5">
                  <Car className="w-4 h-4" />
                  <span>2. Datos del Vehículo (Patente)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Patente / Dominio *</label>
                    <input
                      type="text"
                      required
                      placeholder="AF 123 CD"
                      value={orderForm.vehiculoPatente}
                      onChange={(e) => setOrderForm({ ...orderForm, vehiculoPatente: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Marca *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ford"
                      value={orderForm.vehiculoMarca}
                      onChange={(e) => setOrderForm({ ...orderForm, vehiculoMarca: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Focus 2.0"
                      value={orderForm.vehiculoModelo}
                      onChange={(e) => setOrderForm({ ...orderForm, vehiculoModelo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Año</label>
                    <input
                      type="number"
                      placeholder="2020"
                      value={orderForm.vehiculoAnio}
                      onChange={(e) => setOrderForm({ ...orderForm, vehiculoAnio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Color</label>
                    <input
                      type="text"
                      placeholder="Ej: Blanco"
                      value={orderForm.vehiculoColor}
                      onChange={(e) => setOrderForm({ ...orderForm, vehiculoColor: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos de Recepción */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-3 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  <span>3. Peritaje de Ingreso y Diagnóstico</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nivel de Nafta</label>
                    <select
                      value={orderForm.nivelNafta}
                      onChange={(e) => setOrderForm({ ...orderForm, nivelNafta: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                    >
                      <option value="VACIO">Reserva / Vacío</option>
                      <option value="1/4">1/4 de Tanque</option>
                      <option value="1/2">1/2 de Tanque</option>
                      <option value="3/4">3/4 de Tanque</option>
                      <option value="LLENO">Tanque Lleno</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Odómetro (Km)</label>
                    <input
                      type="number"
                      placeholder="Ej: 65400"
                      value={orderForm.kilometraje}
                      onChange={(e) => setOrderForm({ ...orderForm, kilometraje: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mano de Obra Inicial ($)</label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={orderForm.costoManoDeObra}
                      onChange={(e) => setOrderForm({ ...orderForm, costoManoDeObra: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Detalles del Ingreso / Síntomas reportados *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Describa el motivo de la orden (ruidos, service preventivo, luz de check engine, pérdida de fluidos)..."
                    value={orderForm.detallesIngreso}
                    onChange={(e) => setOrderForm({ ...orderForm, detallesIngreso: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Peritaje Inicial del Dueño: Abolladuras y Desperfectos */}
                <div className="space-y-2 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-xs uppercase tracking-wider">
                        Peritaje Inicial del Dueño (Daños Previos)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                      Constatación Legal
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-tight">
                    Comentario del dueño indicando abolladuras, rayones y desperfectos preexistentes al entregar el auto:
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Ej: El cliente manifiesta tener un bollo en guardabarro trasero derecho por estacionamiento, raspón en paragolpe delantero y óptica izquierda rajada..."
                    value={orderForm.comentariosDuenio}
                    onChange={(e) => setOrderForm({ ...orderForm, comentariosDuenio: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-medium text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-amber-900 font-bold">Atajos rápidos:</span>
                    {[
                      "Paragolpe rayado",
                      "Bollo en puerta",
                      "Parabrisas picado",
                      "Óptica rajada",
                      "Sin daños previos (impecable)",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          const current = orderForm.comentariosDuenio.trim();
                          const updated = current ? `${current}. ${sug}` : sug;
                          setOrderForm({ ...orderForm, comentariosDuenio: updated });
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition-colors cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-colors disabled:bg-slate-400"
                >
                  {submitting ? "Generando Orden..." : "Abrir Orden de Trabajo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
