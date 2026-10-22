"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Wrench,
  History,
  CheckCircle2,
  FileText,
  ChevronRight,
  Plus,
  Fuel,
  Gauge,
  X,
  AlertCircle,
  Phone,
} from "lucide-react";
import { useAppDialog } from "@/components/AppDialog";

export default function VehiculoHistorialClinicoPage() {
  const { alert, confirm } = useAppDialog();
  const { patente } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [clinicalStats, setClinicalStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchVehicle = async () => {
    try {
      const res = await fetch(`/api/vehicles/${patente}`);
      if (res.ok) {
        const data = await res.json();
        setVehicle(data.vehicle);
        setClinicalStats(data.clinicalStats);
      }
    } catch (err) {
      console.error("Error al cargar ficha del vehículo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, [patente]);

  const isCancelledOrder = (o: any) => {
    return Boolean(
      o &&
      (o.estado === "CANCELADO" ||
        o.motivoCancelacion ||
        (() => {
          try {
            const p = typeof o.checklistDanio === "string" ? JSON.parse(o.checklistDanio) : o.checklistDanio;
            return Boolean(p?.motivoCancelacion);
          } catch {
            return false;
          }
        })())
    );
  };

  const activeOrder = vehicle?.workOrders?.find(
    (o: any) =>
      o.estado !== "FINALIZADO" &&
      o.estado !== "REPARADO" &&
      o.estado !== "TERMINADO" &&
      o.estado !== "ENTREGADO" &&
      o.estado !== "ARCHIVADO" &&
      o.estado !== "CANCELADO" &&
      !isCancelledOrder(o)
  );

  const openNewOrderModal = async () => {
    if (!vehicle) return;
    if (activeOrder) {
      await alert({
        title: "Orden Activa en Taller",
        message: `Este vehículo ya se encuentra en el taller con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}). No se puede abrir una nueva orden simultánea.`,
        variant: "warning",
      });
      return;
    }
    // Navegar a la página de órdenes con deep-link para abrir modal en paso 3
    const clientId = vehicle.clientId || vehicle.client?.id || "";
    const vehicleId = vehicle.id || "";
    router.push(`/app/ordenes?newOrder=1&clientId=${clientId}&vehicleId=${vehicleId}`);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Vehículo no encontrado</h2>
        <Link href="/app/vehiculos" className="text-xs text-sky-600 hover:underline mt-2 inline-block">
          Volver al parque automotor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver y Barra de Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Link
            href="/app/vehiculos"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0 mt-0.5 sm:mt-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                Ficha Técnica e Historial del Vehículo
              </span>
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                {vehicle.patente}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 break-words mt-0.5">
              {vehicle.marca} {vehicle.modelo} ({vehicle.anio})
            </h1>
          </div>
        </div>

        {/* Botones Principales de Recepción */}
        {!activeOrder && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={openNewOrderModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Abrir Orden de Trabajo / Peritaje</span>
            </button>
          </div>
        )}
      </div>

      {/* Alerta de Vehículo Activo en Taller */}
      {activeOrder && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-800 text-sm">
                Vehículo actualmente en servicio en el taller
              </p>
              <p className="text-amber-900/90 mt-0.5 text-xs leading-relaxed">
                Este vehículo cuenta con la <strong>Orden activa #{activeOrder.numeroOrden}</strong> (Estado: <strong>{activeOrder.estado}</strong>). Según las reglas del taller, un vehículo no puede tener dos órdenes simultáneas en reparación.
              </p>
            </div>
          </div>
          <Link
            href={`/app/ordenes/${activeOrder.id}`}
            className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs whitespace-nowrap shrink-0 transition-colors"
          >
            Ver Orden #{activeOrder.numeroOrden} →
          </Link>
        </div>
      )}

      {/* Alerta de Acción Exitosa */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tarjetas de Ficha Técnica y Titular */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Datos Técnicos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Datos Técnicos del Auto
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between py-1 border-b border-slate-100/80 gap-0.5">
              <span className="font-bold text-slate-700">Marca y Modelo:</span>
              <span className="text-slate-900 font-semibold">{vehicle.marca} {vehicle.modelo}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between py-1 border-b border-slate-100/80 gap-0.5">
              <span className="font-bold text-slate-700">Año de Fabricación:</span>
              <span className="text-slate-900 font-semibold">{vehicle.anio || "S/D"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between py-1 border-b border-slate-100/80 gap-0.5">
              <span className="font-bold text-slate-700">Color:</span>
              <span className="text-slate-900 font-semibold">{vehicle.color || "No especificado"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between py-1 gap-0.5">
              <span className="font-bold text-slate-700">Nº Bastidor (VIN):</span>
              <span className="font-mono font-bold text-slate-900 break-all">{vehicle.nroChasis || "No especificado"}</span>
            </div>
          </div>
        </div>

        {/* Titular Asignado */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Titular Registrado
          </span>
          <Link
            href={`/app/clientes/${vehicle.client?.id}`}
            className="text-sm font-bold text-slate-900 hover:text-sky-600 block transition-colors truncate"
          >
            {vehicle.client?.nombre} {vehicle.client?.apellido}
          </Link>
          <div className="space-y-1 text-xs text-slate-600">
            <p className="font-mono text-[11px]">DNI: {vehicle.client?.dni}</p>
            {vehicle.client?.telefono && (
              <p className="flex items-center gap-1.5 text-slate-700 font-medium break-all">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{vehicle.client.telefono}</span>
              </p>
            )}
          </div>
        </div>

        {/* Estadísticas de Taller */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Historial de Reparaciones
          </span>
          <p className="text-2xl font-black text-slate-900">
            {clinicalStats?.totalServicios || 0} {clinicalStats?.totalServicios === 1 ? "ingreso" : "ingresos"}
          </p>
          <span className="text-[11px] text-slate-500 block">
            {vehicle.workOrders && vehicle.workOrders.length > 0
              ? `Último ingreso: ${new Date(vehicle.workOrders[0].fechaIngreso).toLocaleDateString("es-AR")}`
              : "Sin intervenciones previas"}
          </span>
        </div>
      </div>

      {/* Historial Clínico de Órdenes de Trabajo */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Historial de Órdenes de Trabajo ({vehicle.workOrders?.length || 0})
            </h2>
            <p className="text-xs text-slate-500">
              Línea de tiempo de servicios realizados, piezas reemplazadas y peritajes.
            </p>
          </div>
          <button
            onClick={openNewOrderModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3.5 py-2.5 rounded-xl border border-sky-200 cursor-pointer shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Nueva Orden</span>
          </button>
        </div>

        {vehicle.workOrders?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No hay órdenes de trabajo previas para este vehículo</p>
            <p className="text-[11px]">Hacé clic en &quot;Abrir Nueva Orden&quot; para registrar el primer ingreso.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicle.workOrders.map((order: any) => {
              let hasSig = false;
              if (order.checklistDanio) {
                try {
                  const parsed =
                    typeof order.checklistDanio === "string"
                      ? JSON.parse(order.checklistDanio)
                      : order.checklistDanio;
                  hasSig = Boolean(parsed?.firmaCliente);
                } catch {}
              }

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-900">
                        Orden #{order.numeroOrden}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                          order.estado === "FINALIZADO" || order.estado === "ENTREGADO"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.estado === "EN_CURSO" || order.estado === "EN_REPARACION"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {order.estado.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-400 sm:ml-auto">
                        {new Date(order.fechaIngreso).toLocaleDateString("es-ES")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
                      {order.detallesIngreso}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] text-slate-500 pt-0.5">
                      {order.kilometraje && (
                        <span className="flex items-center gap-1 font-mono">
                          <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.kilometraje.toLocaleString("es-ES")} km</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Combustible: {order.nivelNafta}</span>
                      </span>
                      {order.mechanic && (
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Mecánico: {order.mechanic.nombre} {order.mechanic.apellido || ""}</span>
                        </span>
                      )}
                      {hasSig && (
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Firma cliente</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 flex sm:flex-col justify-end shrink-0">
                    <Link
                      href={`/app/ordenes/${order.id}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-200/70 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs transition-colors"
                    >
                      <span>Ver orden</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
