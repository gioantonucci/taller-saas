"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  Wrench,
  History,
  CheckCircle2,
  Trash2,
  FileText,
  ChevronRight,
  Plus,
  Fuel,
  Gauge,
  X,
  AlertCircle,
  RefreshCw,
  Phone,
  ShieldAlert,
  PenTool,
} from "lucide-react";
import { openWorkOrderSchema, OpenWorkOrderValues } from "@/lib/validations";
import { useAppDialog } from "@/components/AppDialog";
import ClientSignaturePad from "@/components/ClientSignaturePad";

export default function VehiculoHistorialClinicoPage() {
  const { alert, confirm } = useAppDialog();
  const { patente } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [clinicalStats, setClinicalStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [firmaCliente, setFirmaCliente] = useState<string | null>(null);
  const modalScrollRef = useRef<HTMLFormElement | null>(null);

  // Asegurar que al abrir el modal siempre aparezca en el top del scroll
  useEffect(() => {
    if (orderModalOpen && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [orderModalOpen]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OpenWorkOrderValues>({
    resolver: zodResolver(openWorkOrderSchema),
    defaultValues: {
      vehicleId: "",
      nivelNafta: "1/2",
      kilometraje: 0,
      detallesIngreso: "",
      comentariosDuenio: "",
    },
  });

  const selectedNafta = watch("nivelNafta");

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
    setOrderError(null);
    setFirmaCliente(null);
    reset({
      vehicleId: vehicle.id,
      nivelNafta: "1/2",
      kilometraje: vehicle.workOrders?.[0]?.kilometraje || 45000,
      detallesIngreso: "",
      comentariosDuenio: "",
    });
    setOrderModalOpen(true);
  };

  const onSubmitOrder = async (values: OpenWorkOrderValues) => {
    if (activeOrder) {
      setOrderError(
        `Operación denegada: El vehículo ya tiene la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}).`
      );
      return;
    }

    setSubmittingOrder(true);
    setOrderError(null);

    try {
      const checklistDanioPayload = {
        fechaHoraCheckin: new Date().toLocaleString("es-AR"),
        kilometrajeTablero: values.kilometraje || 0,
        nivelCombustible: values.nivelNafta || "1/2",
        comentariosDuenio: values.comentariosDuenio || "",
        damagePins: [],
        autorizaViaPublica: true,
        firmaCliente: firmaCliente || null,
        fechaFirmaCliente: firmaCliente ? new Date().toISOString() : null,
        inventarioCabina: {
          ruedaAuxilio: true,
          criqueYHerramientas: true,
          tuercaSeguridad: false,
          documentacion: true,
          estereoFunciona: true,
          matafuegoVigente: true,
          tapaCombustible: true,
        },
      };

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          firmaCliente: firmaCliente || null,
          checklistDanio: checklistDanioPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOrderError(data.error || "Error al abrir la orden de trabajo");
        setSubmittingOrder(false);
        return;
      }

      setOrderModalOpen(false);
      setActionSuccess(`¡Orden #${data.order.numeroOrden} abierta con éxito! Estado: Pendiente de peritaje.`);
      setTimeout(() => setActionSuccess(null), 5000);
      fetchVehicle();
    } catch {
      setOrderError("Error de conexión al abrir la orden");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!vehicle) return;
    const confirmDelete = await confirm({
      title: "Eliminar Vehículo",
      message: `¿Confirmás la eliminación del vehículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.patente})?\n\nSe preservará todo el historial en órdenes y auditoría intacto.`,
      confirmText: "Eliminar Vehículo",
      cancelText: "Cancelar",
      variant: "danger",
      icon: "trash",
    });
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${patente}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await alert({
          title: "Vehículo Eliminado",
          message: "El vehículo ha sido eliminado correctamente del sistema.",
          variant: "success",
        });
        router.push("/app/vehiculos");
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
    } finally {
      setDeleting(false);
    }
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
        <div className="flex items-center gap-3">
          <Link
            href="/app/vehiculos"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                Ficha Técnica e Historial del Vehículo
              </span>
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                {vehicle.patente}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {vehicle.marca} {vehicle.modelo} ({vehicle.anio})
            </h1>
          </div>
        </div>

        {/* Botones Principales de Recepción */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeOrder ? (
            <Link
              href={`/app/ordenes/${activeOrder.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Ver Orden en Taller (#{activeOrder.numeroOrden})</span>
            </Link>
          ) : (
            <button
              onClick={openNewOrderModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Orden de Trabajo / Peritaje</span>
            </button>
          )}

          <button
            onClick={handleSoftDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            title="Eliminar vehículo"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Vehículo Activo en Taller */}
      {activeOrder && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-800 text-sm">
                Vehículo actualmente en servicio en el taller
              </p>
              <p className="text-amber-900/90 mt-0.5 text-xs">
                Este vehículo cuenta con la <strong>Orden activa #{activeOrder.numeroOrden}</strong> (Estado: <strong>{activeOrder.estado}</strong>). Según las reglas del taller, un vehículo no puede tener dos órdenes simultáneas abiertas. Una vez finalizado el trabajo y confirmada la entrega al cliente (archivado), quedará habilitado para nuevos ingresos.
              </p>
            </div>
          </div>
          <Link
            href={`/app/ordenes/${activeOrder.id}`}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs whitespace-nowrap shrink-0 transition-colors"
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Datos Técnicos del Auto
          </span>
          <div className="space-y-1 text-xs">
            <p className="text-slate-700">
              <strong className="text-slate-900">Marca y Modelo:</strong> {vehicle.marca} {vehicle.modelo}
            </p>
            <p className="text-slate-700">
              <strong className="text-slate-900">Año de Fabricación:</strong> {vehicle.anio || "S/D"}
            </p>
            <p className="text-slate-700">
              <strong className="text-slate-900">Color:</strong> {vehicle.color || "No especificado"}
            </p>
          </div>
        </div>

        {/* Titular Asignado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Titular Registrado
          </span>
          <Link
            href={`/app/clientes/${vehicle.client?.id}`}
            className="text-sm font-bold text-slate-900 hover:text-sky-600 block transition-colors"
          >
            {vehicle.client?.nombre} {vehicle.client?.apellido}
          </Link>
          <div className="space-y-1 text-xs text-slate-600">
            <p className="font-mono text-[11px]">DNI: {vehicle.client?.dni}</p>
            {vehicle.client?.telefono && (
              <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{vehicle.client.telefono}</span>
              </p>
            )}
          </div>
        </div>

        {/* Estadísticas de Taller */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
            className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Abrir Nueva Orden</span>
          </button>
        </div>

        {vehicle.workOrders?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No hay órdenes de trabajo previas para este vehículo</p>
            <p className="text-[11px]">Hacé clic en "Abrir Orden de Trabajo / Peritaje" para registrar el primer ingreso.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicle.workOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
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
                    <span className="text-[11px] text-slate-400">
                      {new Date(order.fechaIngreso).toLocaleDateString("es-ES")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    {order.detallesIngreso}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                    {order.kilometraje && (
                      <span className="flex items-center gap-1 font-mono">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        {order.kilometraje.toLocaleString("es-ES")} km
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-slate-400" />
                      Combustible: {order.nivelNafta}
                    </span>
                    {order.mechanic && (
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        Mecánico: {order.mechanic.nombre} {order.mechanic.apellido}
                      </span>
                    )}
                    {(() => {
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
                      return hasSig ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Firma cliente</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center pt-2 sm:pt-0">
                  <Link
                    href={`/app/ordenes/${order.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-white bg-white hover:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-900 shadow-xs hover:shadow transition-all whitespace-nowrap shrink-0 group cursor-pointer"
                  >
                    <span>Ver orden</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: APERTURA DE ORDEN DE TRABAJO (RECEPCIÓN BÁSICA)                     */}
      {/* ========================================================================= */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Apertura de Orden de Trabajo
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    {vehicle.marca} {vehicle.modelo} • Patente {vehicle.patente}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error general */}
            {orderError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Formulario */}
            <form ref={modalScrollRef} onSubmit={handleSubmit(onSubmitOrder)} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Nivel de Nafta */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-sky-600" />
                  <span>Nivel de Combustible al Ingreso</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["VACIO", "1/4", "1/2", "3/4", "LLENO"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setValue("nivelNafta", level)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        selectedNafta === level
                          ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                {errors.nivelNafta && (
                  <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                    {errors.nivelNafta.message}
                  </span>
                )}
              </div>

              {/* Kilometraje Actual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-sky-600" />
                  <span>Kilometraje Actual de Tablero (km)</span>
                </label>
                <input
                  type="number"
                  {...register("kilometraje", { valueAsNumber: true })}
                  placeholder="Ej. 65000"
                  className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 ${
                    errors.kilometraje
                      ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                      : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                  }`}
                />
                {errors.kilometraje && (
                  <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                    {errors.kilometraje.message}
                  </span>
                )}
              </div>

              {/* Motivo de Ingreso / Notas del Cliente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>Motivo del Ingreso / Falla Reportada por el Cliente <span className="text-rose-500">*</span></span>
                </label>
                <textarea
                  rows={3}
                  {...register("detallesIngreso")}
                  placeholder="Ej. Service periódico de 60.000km, ruido en el tren delantero al doblar a la izquierda, y check engine intermitente."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                    errors.detallesIngreso
                      ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                      : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                  }`}
                />
                {errors.detallesIngreso && (
                  <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                    {errors.detallesIngreso.message}
                  </span>
                )}
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
                  {...register("comentariosDuenio")}
                  placeholder="Ej: El cliente manifiesta tener un bollo en guardabarro trasero derecho por estacionamiento, raspón en paragolpe delantero y óptica izquierda rajada..."
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
                        const current = watch("comentariosDuenio") || "";
                        const updated = current.trim() ? `${current.trim()}. ${sug}` : sug;
                        setValue("comentariosDuenio", updated);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Firma Digital del Cliente en Tablet / Pantalla */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-sky-600" />
                    <span>Firma del Cliente (Recepción y Resguardo)</span>
                  </span>
                  <span className={`text-[11px] font-bold ${firmaCliente ? "text-emerald-600" : "text-slate-400"}`}>
                    {firmaCliente ? "✓ Firma registrada" : "Opcional / en pantalla"}
                  </span>
                </div>
                <ClientSignaturePad
                  value={firmaCliente}
                  onChange={(sig) => setFirmaCliente(sig)}
                  height={170}
                  title="Firma del Titular / Conductor al ingresar"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingOrder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generando Orden...</span>
                    </>
                  ) : (
                    <span>Confirmar Ingreso al Taller</span>
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
