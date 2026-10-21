"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Car,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Trash2,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { getStatusInfo } from "@/lib/order-status";
import { useAppDialog } from "@/components/AppDialog";

export default function ClienteDetallePage() {
  const { alert, confirm } = useAppDialog();
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Modal Asociar Vehículo (solo autos, sin creación de usuarios)
  const [asociarModalOpen, setAsociarModalOpen] = useState(false);
  const [asociarTab, setAsociarTab] = useState<"NUEVO" | "EXISTENTE">("NUEVO");
  const [nuevoAuto, setNuevoAuto] = useState({
    patente: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    color: "",
  });
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [selectedExistingPatente, setSelectedExistingPatente] = useState("");
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [submittingAsociar, setSubmittingAsociar] = useState(false);
  const [asociarError, setAsociarError] = useState<string | null>(null);
  const [asociarSuccess, setAsociarSuccess] = useState<string | null>(null);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
      }
    } catch (err) {
      console.error("Error al cargar cliente:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  const handleSoftDelete = async () => {
    const isConfirmed = await confirm({
      title: "Eliminar Cliente",
      message: "¿Está seguro de eliminar a este cliente? Se mantendrá el historial de órdenes y auditoría intacto.",
      confirmText: "Eliminar Cliente",
      cancelText: "Cancelar",
      variant: "danger",
      icon: "trash",
    });
    if (!isConfirmed) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await alert({
          title: "Cliente Eliminado",
          message: "El cliente ha sido eliminado correctamente del sistema.",
          variant: "success",
        });
        router.push("/app/clientes");
      } else {
        const data = await res.json();
        await alert({
          title: "Error al eliminar",
          message: data.error || "No se pudo eliminar el cliente",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      await alert({
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor al eliminar el cliente.",
        variant: "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openAsociarModal = () => {
    setAsociarError(null);
    setNuevoAuto({
      patente: "",
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      color: "",
    });
    setSelectedExistingPatente("");
    setAsociarTab("NUEVO");
    setAsociarModalOpen(true);
  };

  const fetchAvailableVehicles = async () => {
    setLoadingAvailable(true);
    try {
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        const others = (data.vehicles || []).filter((v: any) => v.clientId !== client?.id);
        setAvailableVehicles(others);
      }
    } catch (err) {
      console.error("Error al cargar vehículos disponibles:", err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleRegistrarNuevoAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoAuto.patente.trim() || !nuevoAuto.marca.trim() || !nuevoAuto.modelo.trim()) {
      setAsociarError("Por favor completá Patente, Marca y Modelo.");
      return;
    }

    setSubmittingAsociar(true);
    setAsociarError(null);

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patente: nuevoAuto.patente.trim().toUpperCase(),
          marca: nuevoAuto.marca.trim(),
          modelo: nuevoAuto.modelo.trim(),
          anio: Number(nuevoAuto.anio),
          color: nuevoAuto.color.trim(),
          modoCliente: "EXISTENTE",
          clientId: client.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAsociarError(data.error || "No se pudo asociar el vehículo.");
        setSubmittingAsociar(false);
        return;
      }

      setAsociarModalOpen(false);
      setAsociarSuccess(
        `Vehículo ${data.vehicle.marca} ${data.vehicle.modelo} (${data.vehicle.patente}) asociado exitosamente a ${client.nombre} ${client.apellido}.`
      );
      setTimeout(() => setAsociarSuccess(null), 4000);
      fetchClient();
    } catch {
      setAsociarError("Error de comunicación con el servidor.");
    } finally {
      setSubmittingAsociar(false);
    }
  };

  const handleVincularExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingPatente) {
      setAsociarError("Seleccioná un vehículo para vincular.");
      return;
    }

    setSubmittingAsociar(true);
    setAsociarError(null);

    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(selectedExistingPatente)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAsociarError(data.error || "No se pudo vincular el vehículo.");
        setSubmittingAsociar(false);
        return;
      }

      setAsociarModalOpen(false);
      setAsociarSuccess(
        `Vehículo ${data.vehicle.marca} ${data.vehicle.modelo} (${data.vehicle.patente}) vinculado exitosamente a ${client.nombre} ${client.apellido}.`
      );
      setTimeout(() => setAsociarSuccess(null), 4000);
      fetchClient();
    } catch {
      setAsociarError("Error de comunicación con el servidor.");
    } finally {
      setSubmittingAsociar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Cliente no encontrado</h2>
        <Link href="/app/clientes" className="text-xs text-sky-600 hover:underline mt-2 inline-block">
          Volver al directorio
        </Link>
      </div>
    );
  }

  // Agrupar órdenes de todos los vehículos de este cliente
  const allOrders = client.vehicles.flatMap((v: any) =>
    (v.workOrders || []).map((o: any) => ({ ...o, vehicle: v }))
  );

  return (
    <div className="space-y-6">
      {/* Botón Volver y Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/clientes"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
              Ficha del Cliente
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {client.nombre} {client.apellido}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSoftDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            title="Eliminar cliente"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Acción Exitosa */}
      {asociarSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{asociarSuccess}</span>
        </div>
      )}

      {/* Resumen de Datos: 2 Columnas (Identificación y Canales de Contacto) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Datos de Identificación
          </span>
          <p className="font-mono text-base font-bold text-slate-900">
            DNI/CUIT: {client.dni}
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{client.direccion || "Sin dirección registrada"}</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Canales de Contacto
          </span>
          <p className="text-xs text-slate-800 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="font-semibold">{client.telefono || "Sin teléfono registrado"}</span>
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>{client.email || "Sin correo electrónico"}</span>
          </p>
        </div>
      </div>

      {/* Vehículos del Cliente */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Vehículos Registrados ({client.vehicles.length})
            </h2>
            <p className="text-xs text-slate-500">Automóviles pertenecientes al titular</p>
          </div>
          <button
            type="button"
            onClick={openAsociarModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Asociar Vehículo</span>
          </button>
        </div>

        {client.vehicles.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <p className="text-xs text-slate-400">
              No hay vehículos asociados a este cliente aún.
            </p>
            <button
              type="button"
              onClick={openAsociarModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Asociar Primer Vehículo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {client.vehicles.map((v: any) => {
              const activeOrder = v.workOrders?.find(
                (o: any) =>
                  o.estado !== "ENTREGADO" &&
                  o.estado !== "ARCHIVADO" &&
                  o.estado !== "CANCELADO" &&
                  !o.motivoCancelacion
              );
              return (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Car className="w-4 h-4 text-sky-600" />
                      <span className="font-bold text-slate-900 text-sm">
                        {v.marca} {v.modelo}
                      </span>
                      {activeOrder && (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          En Taller (#{activeOrder.numeroOrden})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300">
                        {v.patente}
                      </span>
                      <span className="text-xs text-slate-500">Año {v.anio}</span>
                    </div>
                  </div>

                  <Link
                    href={`/app/vehiculos/${v.patente}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
                  >
                    <span>Historial</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de Órdenes del Cliente */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
          Historial de Órdenes de Trabajo del Cliente
        </h2>

        {allOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No se registran órdenes de trabajo previas para este cliente.
          </div>
        ) : (
          <>
            {/* VISTA MOBILE: Tarjetas Responsivas */}
            <div className="md:hidden divide-y divide-slate-100">
              {allOrders.map((o: any) => {
                const statusInfo = getStatusInfo(o.estado);
                return (
                  <div key={o.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        #{o.numeroOrden}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border whitespace-nowrap shrink-0 ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        {o.vehicle.marca} {o.vehicle.modelo}
                      </span>{" "}
                      <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                        {o.vehicle.patente}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        {new Date(o.fechaIngreso).toLocaleDateString("es-AR")}
                      </span>

                      <Link
                        href={`/app/ordenes/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <span>Ver Orden</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA DESKTOP: Tabla con Min-Width */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">Orden</th>
                    <th className="py-2.5 px-3">Vehículo</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allOrders.map((o: any) => {
                    const statusInfo = getStatusInfo(o.estado);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{o.numeroOrden}</td>
                        <td className="py-2.5 px-3">
                          {o.vehicle.marca} {o.vehicle.modelo}{" "}
                          <span className="font-mono text-[11px] text-slate-500">({o.vehicle.patente})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(o.fechaIngreso).toLocaleDateString("es-AR")}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border whitespace-nowrap shrink-0 ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/app/ordenes/${o.id}`}
                            className="text-xs font-bold text-sky-600 hover:underline"
                          >
                            Ver Orden →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal In-Place: Asociar Vehículo (Sin creación de usuarios) */}
      {asociarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Asociar Vehículo
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Para el titular: <strong className="text-slate-700">{client.nombre} {client.apellido}</strong> (DNI: {client.dni})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAsociarModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de modo: Registrar Nuevo vs Vincular Existente */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAsociarTab("NUEVO");
                    setAsociarError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    asociarTab === "NUEVO"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  + Registrar Nuevo Auto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAsociarTab("EXISTENTE");
                    setAsociarError(null);
                    fetchAvailableVehicles();
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    asociarTab === "EXISTENTE"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Vincular Auto Existente
                </button>
              </div>

              {asociarError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{asociarError}</span>
                </div>
              )}

              {asociarTab === "NUEVO" ? (
                <form onSubmit={handleRegistrarNuevoAuto} className="space-y-3.5">
                  <p className="text-xs text-slate-500">
                    Se asociará este automóvil directamente al perfil de{" "}
                    <strong className="text-slate-700">{client.nombre} {client.apellido}</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Patente / Dominio <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nuevoAuto.patente}
                        onChange={(e) =>
                          setNuevoAuto({ ...nuevoAuto, patente: e.target.value.toUpperCase() })
                        }
                        placeholder="AF 142 XY"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Marca <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nuevoAuto.marca}
                        onChange={(e) => setNuevoAuto({ ...nuevoAuto, marca: e.target.value })}
                        placeholder="Ej: Ford, Toyota"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Modelo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nuevoAuto.modelo}
                        onChange={(e) => setNuevoAuto({ ...nuevoAuto, modelo: e.target.value })}
                        placeholder="Ej: Focus, Corolla"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Año <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={nuevoAuto.anio}
                        onChange={(e) =>
                          setNuevoAuto({ ...nuevoAuto, anio: parseInt(e.target.value, 10) || 2024 })
                        }
                        placeholder="2022"
                        min="1950"
                        max={new Date().getFullYear() + 1}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      value={nuevoAuto.color}
                      onChange={(e) => setNuevoAuto({ ...nuevoAuto, color: e.target.value })}
                      placeholder="Gris Plata, Blanco, Azul..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAsociarModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAsociar}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingAsociar ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <span>Asociar Vehículo</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVincularExistente} className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Seleccioná un vehículo ya registrado en el taller para reasignarlo o vincularlo a{" "}
                    <strong className="text-slate-700">{client.nombre} {client.apellido}</strong>.
                  </p>

                  {loadingAvailable ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Cargando vehículos del taller...
                    </div>
                  ) : availableVehicles.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                      No hay otros vehículos registrados en el taller para vincular.
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Vehículo Registrado <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedExistingPatente}
                        onChange={(e) => setSelectedExistingPatente(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                        required
                      >
                        <option value="">-- Seleccionar vehículo --</option>
                        {availableVehicles.map((v) => (
                          <option key={v.id} value={v.patente}>
                            {v.patente} - {v.marca} {v.modelo} (Año {v.anio}) {v.client ? `[Titular actual: ${v.client.nombre} ${v.client.apellido}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAsociarModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAsociar || !selectedExistingPatente}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingAsociar ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <span>Vincular a este Titular</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
