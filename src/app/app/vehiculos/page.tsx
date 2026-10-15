"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { quickVehicleAndClientSchema, QuickVehicleAndClientValues } from "@/lib/validations";
import { useAppDialog } from "@/components/AppDialog";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickVehicleAndClientValues>({
    resolver: zodResolver(quickVehicleAndClientSchema),
    defaultValues: {
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      patente: "",
      color: "",
      modoCliente: "EXISTENTE",
      clientId: initialClientId,
      clienteNombre: "",
      clienteApellido: "",
      clienteDni: "",
      clienteTelefono: "",
      clienteEmail: "",
    },
  });

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

  const openCreateModal = () => {
    setSubmitError(null);
    reset({
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      patente: "",
      color: "",
      modoCliente: "EXISTENTE",
      clientId: clients[0]?.id || "",
      clienteNombre: "",
      clienteApellido: "",
      clienteDni: "",
      clienteTelefono: "",
      clienteEmail: "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: QuickVehicleAndClientValues) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Error al registrar vehículo");
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      setActionSuccess(
        `Vehículo ${data.vehicle.marca} ${data.vehicle.modelo} (${data.vehicle.patente}) registrado exitosamente.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
      fetchVehicles();
      fetchClientsList();
    } catch {
      setSubmitError("Error de comunicación con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

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
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Vehículo</span>
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

                    <span className="inline-flex items-center gap-1.5 font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200 text-[11px]">
                      <History className="w-3.5 h-3.5 text-sky-600" />
                      <span>{v.workOrders?.length || 0} órdenes</span>
                    </span>
                  </div>

                  {/* Botón Ver Ficha Clínica */}
                  <Link
                    href={`/app/vehiculos/${v.patente}`}
                    className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Ficha Clínica</span>
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
                    <th className="p-3.5">Historial</th>
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

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200 text-[11px]">
                          <History className="w-3.5 h-3.5 text-sky-600" />
                          <span>{v.workOrders?.length || 0} órdenes</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/app/vehiculos/${v.patente}`}
                            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <span>Ficha Clínica</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Modal de Alta de Vehículo con ZOD + REACT HOOK FORM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Registro de Nuevo Vehículo
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Asignación a cliente existente o alta rápida simultánea
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error general */}
            {submitError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Formulario scrolleable */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Sección 1: Datos Técnicos del Vehículo */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  1. Información Técnica del Auto
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Marca <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register("marca")}
                      placeholder="Ej. Toyota, Volkswagen, Ford"
                      className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                        errors.marca
                          ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                      }`}
                    />
                    {errors.marca && (
                      <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                        {errors.marca.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modelo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register("modelo")}
                      placeholder="Ej. Corolla XEI, Gol Trend"
                      className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                        errors.modelo
                          ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                      }`}
                    />
                    {errors.modelo && (
                      <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                        {errors.modelo.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Patente / Dominio <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register("patente")}
                      placeholder="AF 142 XY"
                      className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-2 ${
                        errors.patente
                          ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                      }`}
                    />
                    {errors.patente && (
                      <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                        {errors.patente.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Año de Fabricación <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      {...register("anio", { valueAsNumber: true })}
                      placeholder="2022"
                      className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 ${
                        errors.anio
                          ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                      }`}
                    />
                    {errors.anio && (
                      <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                        {errors.anio.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      {...register("color")}
                      placeholder="Gris Plata"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Asignación de Propietario (Cliente) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  2. Propietario / Titular del Vehículo
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seleccionar Cliente Registrado <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register("clientId")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellido} (DNI {c.dni})
                      </option>
                    ))}
                  </select>
                  {errors.clientId && (
                    <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                      {errors.clientId.message}
                    </span>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    El registro asocia el vehículo al cliente seleccionado. Para dar de alta un nuevo titular, hacelo desde la sección{" "}
                    <Link href="/app/clientes" className="text-sky-600 font-bold hover:underline">
                      Clientes
                    </Link>.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Registrar Vehículo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
