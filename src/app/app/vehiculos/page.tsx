"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Car,
  Search,
  ChevronRight,
  Plus,
  History,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useAppDialog } from "@/components/AppDialog";
import { getStatusInfo } from "@/lib/order-status";
import IngresarAutoModal from "@/components/IngresarAutoModal";

function getVehicleStatus(v: any) {
  const orders = v.workOrders || [];
  if (orders.length === 0) {
    return {
      label: "Sin órdenes",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      orderNumber: null,
      orderId: null,
    };
  }

  // Buscar primero orden activa en taller
  const activeOrder = orders.find(
    (o: any) =>
      o.estado !== "FINALIZADO" &&
      o.estado !== "REPARADO" &&
      o.estado !== "TERMINADO" &&
      o.estado !== "ENTREGADO" &&
      o.estado !== "ARCHIVADO" &&
      o.estado !== "CANCELADO" &&
      o.estado !== "CANCELADA" &&
      o.estado !== "DADA_DE_BAJA"
  );

  const targetOrder = activeOrder || orders[0];
  const info = getStatusInfo(targetOrder.estado);

  return {
    ...info,
    orderNumber: targetOrder.numeroOrden,
    orderId: targetOrder.id,
  };
}

function VehiculosContent() {
  const { alert, confirm } = useAppDialog();
  const searchParams = useSearchParams();
  const initialOpen = searchParams.get("nuevo") === "1";
  const initialClientId = searchParams.get("clientId") || "";

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(initialOpen);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/vehicles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error("Error al cargar vehículos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsList = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    }
  };

  useEffect(() => {
    fetchClientsList();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchVehicles();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleSoftDelete = async (v: any) => {
    const confirmDelete = await confirm({
      title: "Eliminar Vehículo",
      message: `¿Confirmás la eliminación del vehículo ${v.marca} ${v.modelo} (${v.patente})?\n\nSe preservará todo el historial de órdenes de trabajo asociadas.`,
      confirmText: "Eliminar Vehículo",
      cancelText: "Cancelar",
      variant: "danger",
      icon: "trash",
    });
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/vehicles/${v.patente}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setActionSuccess(`Vehículo ${v.patente} eliminado correctamente.`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchVehicles();
      } else {
        const data = await res.json();
        await alert({
          title: "Error al eliminar",
          message: data.error || "No se pudo eliminar el vehículo",
          variant: "danger",
        });
      }
    } catch {
      await alert({
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor al eliminar el vehículo.",
        variant: "danger",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                Módulo de Recepción
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Vehículos
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Búsqueda de fichas clínicas de autos, órdenes acumuladas y altas de nuevos ingresos.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Auto</span>
        </button>
      </div>

      {/* Alerta de Acción Exitosa */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Buscador Rápido */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Patente (ej: AF 142 XY), Marca, Modelo o Nombre del Titular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchVehicles}
          title="Refrescar lista"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
        </button>
      </div>

      {/* Tabla de Vehículos Activos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Vehículos Activos Registrados ({vehicles.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Bajas lógicas excluidas</span>
        </div>

        {loading && vehicles.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs">Cargando parque automotor...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Car className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No se encontraron vehículos activos</p>
            <p className="text-xs">Podés registrar uno nuevo asociándolo a un cliente existente o creando un cliente nuevo.</p>
          </div>
        ) : (
          <>
            {/* VISTA MOBILE: Tarjetas Responsivas */}
            <div className="md:hidden divide-y divide-slate-100">
              {vehicles.map((v) => (
                <div key={v.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/vehiculos/${v.patente}`}
                          className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-900 hover:bg-sky-100 hover:text-sky-800 transition-colors inline-block"
                        >
                          {v.patente}
                        </Link>
                        <span className="text-xs text-slate-400 font-semibold">
                          {v.anio}
                        </span>
                      </div>
                      <Link
                        href={`/app/vehiculos/${v.patente}`}
                        className="font-bold text-slate-900 hover:text-sky-600 transition-colors text-sm block"
                      >
                        {v.marca} {v.modelo}
                      </Link>
                      {v.color && (
                        <span className="text-[11px] text-slate-400 block">
                          Color: {v.color}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleSoftDelete(v)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Titular y Órdenes */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Titular</span>
                      <Link
                        href={`/app/clientes/${v.client.id}`}
                        className="font-bold text-slate-800 hover:text-sky-600 transition-colors block"
                      >
                        {v.client.nombre} {v.client.apellido}
                      </Link>
                    </div>

                    {(() => {
                      const st = getVehicleStatus(v);
                      return st.orderId ? (
                        <Link
                          href={`/app/ordenes/${st.orderId}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-tight whitespace-nowrap ${st.badgeClass}`}
                          title={st.orderNumber ? `Orden #${st.orderNumber}` : undefined}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                          <span>{st.label}</span>
                        </Link>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.badgeClass}`}>
                          <span>{st.label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Botón Ver Ficha */}
                  <Link
                    href={`/app/vehiculos/${v.patente}`}
                    className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>

            {/* VISTA DESKTOP: Tabla con Min-Width */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3.5">Dominio / Patente</th>
                    <th className="p-3.5">Marca y Modelo</th>
                    <th className="p-3.5">Año</th>
                    <th className="p-3.5">Titular / Cliente</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <Link
                          href={`/app/vehiculos/${v.patente}`}
                          className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-900 hover:bg-sky-100 hover:text-sky-800 transition-colors inline-block"
                        >
                          {v.patente}
                        </Link>
                      </td>

                      <td className="p-3.5">
                        <Link
                          href={`/app/vehiculos/${v.patente}`}
                          className="font-bold text-slate-900 hover:text-sky-600 transition-colors block text-sm"
                        >
                          {v.marca} {v.modelo}
                        </Link>
                        <span className="text-[11px] text-slate-400">
                          Color: {v.color || "No especificado"}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        {v.anio}
                      </td>

                      <td className="p-3.5">
                        <Link
                          href={`/app/clientes/${v.client.id}`}
                          className="font-bold text-slate-800 hover:text-sky-600 transition-colors block"
                        >
                          {v.client.nombre} {v.client.apellido}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono">
                          DNI {v.client.dni}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {(() => {
                          const st = getVehicleStatus(v);
                          return st.orderId ? (
                            <Link
                              href={`/app/ordenes/${st.orderId}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-tight whitespace-nowrap hover:opacity-80 transition-opacity ${st.badgeClass}`}
                              title={st.orderNumber ? `Orden #${st.orderNumber}: ${st.label}` : st.label}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                              <span>{st.label}</span>
                            </Link>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.badgeClass}`}>
                              <span>{st.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/app/vehiculos/${v.patente}`}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 transition-colors flex items-center justify-center"
                            title="Ver Ficha"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleSoftDelete(v)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Unificado de Ingreso / Registro de Auto */}
      <IngresarAutoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialClientId={initialClientId}
        onSuccess={(createdOrder) => {
          fetchVehicles();
          fetchClientsList();
          setActionSuccess(
            `Vehículo ${createdOrder.vehicle?.marca} ${createdOrder.vehicle?.modelo} (${createdOrder.vehicle?.patente}) ingresado con éxito con la Orden #${createdOrder.numeroOrden}.`
          );
          setTimeout(() => setActionSuccess(null), 5000);
        }}
      />
    </div>
  );
}

export default function VehiculosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Cargando parque automotor...</div>}>
      <VehiculosContent />
    </Suspense>
  );
}
