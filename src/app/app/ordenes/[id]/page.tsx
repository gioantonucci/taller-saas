"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ClipboardList,
  Car,
  User,
  Clock,
  Wrench,
  FileCheck,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  PackageCheck,
  UserCheck,
  X,
  Lock,
  PauseCircle,
  PlayCircle,
  Eye,
} from "lucide-react";
import ConfirmDeliveryModal from "@/components/ConfirmDeliveryModal";
import PeritajeIngresoModal from "@/components/PeritajeIngresoModal";
import FinalizarReparacionModal from "@/components/FinalizarReparacionModal";
import { getStatusInfo } from "@/lib/order-status";

export default function OrdenDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeModalImg, setActiveModalImg] = useState<string | null>(null);
  const [peritajeModalOpen, setPeritajeModalOpen] = useState(false);
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);

  // Modal para asignación formal de mecánico
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMechanicToAssign, setSelectedMechanicToAssign] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const [mechanics, setMechanics] = useState<any[]>([]);
  const [notified, setNotified] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Error al obtener usuario actual:", err);
    }
  };

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/work-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Error al obtener detalle de orden:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await fetch("/api/mechanics");
      if (res.ok) {
        const data = await res.json();
        setMechanics(data.mechanics || []);
      }
    } catch (err) {
      console.error("Error al cargar mecánicos:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
    fetchMechanics();
    fetchCurrentUser();
  }, [id]);

  const currentRole = (currentUser?.role || "").toUpperCase();
  const isMechanic = currentRole === "MECHANIC" || currentRole === "MECANICO";
  const isAdmin = currentRole === "ADMIN";
  const isMechanicOrAdmin = isMechanic || isAdmin;

  const isClosed = Boolean(
    order &&
    (order.estado === "FINALIZADO" ||
      order.estado === "TERMINADO" ||
      order.estado === "REPARADO" ||
      order.estado === "ENTREGADO" ||
      order.estado === "ARCHIVADO")
  );

  const isFinished = Boolean(
    order &&
    (order.estado === "FINALIZADO" ||
      order.estado === "TERMINADO" ||
      order.estado === "REPARADO")
  );

  const isEntregado = Boolean(
    order &&
    (order.estado === "ENTREGADO" ||
      order.estado === "ARCHIVADO")
  );

  const isPeritajeRealizado = Boolean(
    order &&
      (order.estado === "EN_REPARACION" ||
        order.estado === "EN_CURSO" ||
        order.estado === "FINALIZADO" ||
        order.estado === "ENTREGADO" ||
        order.estado === "TERMINADO" ||
        order.estado === "PERITADO" ||
        (order.checklistDanio &&
          (() => {
            try {
              const parsed =
                typeof order.checklistDanio === "string"
                  ? JSON.parse(order.checklistDanio)
                  : order.checklistDanio;
              if (!parsed || typeof parsed !== "object") return false;
              return Boolean(
                parsed.fechaHoraPeritaje ||
                  parsed.fechaHoraCheckin ||
                  parsed.estadoPeritaje === "COMPLETADO" ||
                  parsed.estadoPeritaje === "CERRADO" ||
                  parsed.cerrado === true ||
                  (parsed.damagePins && parsed.damagePins.length > 0) ||
                  (parsed.daniosCarroceria && parsed.daniosCarroceria.length > 0) ||
                  parsed.rayones
              );
            } catch {
              return false;
            }
          })()))
  );

  const getStatusPhaseDescription = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
      case "PENDIENTE_PERITAJE":
      case "INGRESADO":
        return "Vehículo ingresado. Aguarda peritaje.";
      case "EN_REPARACION":
      case "EN_CURSO":
        return "Vehículo peritado. Trabajos técnicos en progreso.";
      case "EN_ESPERA_REPUESTOS":
      case "ESPERANDO_REPUESTOS":
        return "Pausado a la espera de piezas de repuesto.";
      case "FINALIZADO":
      case "REPARADO":
      case "TERMINADO":
        return "Trabajo técnico concluido y listo para entrega.";
      case "ENTREGADO":
      case "ARCHIVADO":
        return "Vehículo entregado al cliente conforme y orden archivada.";
      default:
        return "En gestión operativa.";
    }
  };

  const handleConfirmAssignMechanic = async () => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanicId: selectedMechanicToAssign || null }),
      });
      if (res.ok) {
        await fetchOrder();
        setAssignModalOpen(false);
      } else {
        const d = await res.json();
        alert(d.error || "Error al asignar mecánico");
      }
    } catch {
      alert("Error de conexión al asignar mecánico");
    } finally {
      setAssigning(false);
    }
  };

  const handleNotifyClient = async () => {
    if (!order) return;
    const cleanPhone = order.vehicle?.client?.telefono?.replace(/\D/g, "") || "";
    const car = `${order.vehicle?.marca} ${order.vehicle?.modelo} (${order.vehicle?.patente})`;
    const text = `¡Hola ${order.vehicle?.client?.nombre}! Te avisamos desde Taller Central Pro que tu vehículo ${car} correspondiente a la Orden #${order.numeroOrden} ya se encuentra terminado y listo para retirar. ¡Te esperamos!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
    setNotified(true);

    try {
      await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avisoCliente: true, canal: "WhatsApp" }),
      });
    } catch (e) {
      console.error("Error registrando aviso:", e);
    }
  };

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliverySuccessMsg, setDeliverySuccessMsg] = useState<string | null>(null);

  const handleMarkAsDelivered = () => {
    if (!order) return;
    setDeliveryModalOpen(true);
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    setDelivering(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ENTREGADO" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("❌ Error: " + (data.error || "No se pudo marcar como entregado"));
        return;
      }
      setOrder(data.order);
      setDeliveryModalOpen(false);
      // Redireccionar inmediatamente a la vista de recepción
      router.push(`/app/ordenes?delivered=${order.numeroOrden}`);
    } catch (err) {
      console.error("Error al marcar como entregado:", err);
      alert("Error de conexión al marcar como entregado");
    } finally {
      setDelivering(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    if (order.estado === "ENTREGADO" || order.estado === "ARCHIVADO") {
      alert("❌ La orden de trabajo ya se encuentra entregada y archivada. No se puede revertir ni modificar su estado.");
      return;
    }

    if (order.estado === "FINALIZADO" || order.estado === "REPARADO" || order.estado === "TERMINADO") {
      if (newStatus === "ENTREGADO" || newStatus === "ARCHIVADO") {
        handleMarkAsDelivered();
        return;
      }
      alert("❌ La orden de trabajo ya se encuentra finalizada técnicamente. Solo puede ser marcada como entregada para archivarla.");
      return;
    }

    const isPastInspection =
      order.estado === "EN_REPARACION" ||
      order.estado === "EN_CURSO" ||
      order.estado === "EN_ESPERA_REPUESTOS" ||
      order.estado === "ESPERANDO_REPUESTOS";

    if (isPastInspection && (newStatus === "PENDIENTE_PERITAJE" || newStatus === "PENDIENTE")) {
      alert("❌ No es posible volver hacia atrás al estado de peritaje inicial una vez que el vehículo ya fue peritado.");
      return;
    }

    // Si la orden pasa a un estado de reparación o espera de repuestos:
    // REGLA DE NEGOCIO ESTRICTA: No puede estar en reparación sin mecánico asignado
    const isTargetRepair =
      newStatus === "EN_REPARACION" ||
      newStatus === "EN_CURSO" ||
      newStatus === "EN_ESPERA_REPUESTOS" ||
      newStatus === "ESPERANDO_REPUESTOS";

    if (isTargetRepair && !order.mechanicId && !order.mechanic) {
      alert("❌ Operación denegada: Un vehículo no puede estar en reparación sin un mecánico responsable asignado. Debe designar un mecánico para iniciar los trabajos técnicos.");
      setSelectedMechanicToAssign("");
      setAssignModalOpen(true);
      return;
    }

    // REGLA DE NEGOCIO ESTRICTA: Si no se realizó el peritaje no debería poder llegar al punto de reparación
    if (isTargetRepair && !isPeritajeRealizado) {
      alert("❌ Operación denegada: No se puede avanzar al punto de reparación sin haber realizado previamente el peritaje técnico de ingreso del vehículo.");
      setPeritajeModalOpen(true);
      return;
    }

    // Si marca como terminado: validar que exista mecánico y peritaje antes de abrir modal
    if (newStatus === "FINALIZADO" || newStatus === "TERMINADO") {
      if (!order.mechanicId && !order.mechanic) {
        alert("❌ No se puede finalizar la orden sin un mecánico asignado responsable. Debe designar un técnico antes de concluir la reparación.");
        return;
      }
      if (!isPeritajeRealizado) {
        alert("❌ No se puede finalizar la orden sin haber realizado el peritaje técnico de ingreso.");
        return;
      }
      setIsFinalizarModalOpen(true);
      return;
    }

    let confirmMsg = "";
    if (newStatus === "EN_ESPERA_REPUESTOS") {
      confirmMsg = "¿Desea pausar los trabajos en el taller mientras se esperan repuestos o insumos?";
    } else if (newStatus === "EN_REPARACION") {
      confirmMsg = "¿Desea reanudar los trabajos mecánicos en taller?";
    } else {
      const targetInfo = getStatusInfo(newStatus);
      confirmMsg = `¿Confirmar cambio de estado a '${targetInfo.label}'?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("❌ Error: " + (data.error || "No se pudo actualizar el estado"));
        return;
      }
      setOrder(data.order);
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Error de conexión al actualizar estado");
    } finally {
      setUpdating(false);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Orden no encontrada</h2>
        <Link href="/app/ordenes" className="text-xs text-sky-600 hover:underline mt-2 inline-block">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver y Acciones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/ordenes"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                Orden de Trabajo
              </span>
              <span className="text-sm font-mono font-extrabold text-slate-900">
                #{order.numeroOrden}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {order.vehicle.marca} {order.vehicle.modelo} ({order.vehicle.patente})
            </h1>
          </div>
        </div>

        {/* Acciones de Peritaje (100% Información Local) */}
        <div className="flex flex-wrap items-center gap-2">
          {isPeritajeRealizado ? (
            <button
              type="button"
              onClick={() => setPeritajeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              title="Ver Peritaje de Ingreso Registrado por el Mecánico"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Peritaje Realizado</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs"
              title="El peritaje técnico de ingreso debe ser completado por el mecánico asignado en el taller"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Peritaje Técnico Pendiente</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast de confirmación de entrega */}
      {deliverySuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between gap-3 shadow-lg shadow-emerald-600/30 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs sm:text-sm font-extrabold">{deliverySuccessMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setDeliverySuccessMsg(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner si el vehículo ya fue Entregado y Archivado */}
      {isEntregado && (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
              <PackageCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Vehículo Entregado al Cliente • Orden Archivada
              </h3>
              <p className="text-xs text-slate-600">
                Esta orden de trabajo fue entregada conforme{order.fechaEntrega ? ` el ${new Date(order.fechaEntrega).toLocaleDateString("es-AR")} a las ${new Date(order.fechaEntrega).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs` : ""} y se encuentra archivada en el historial.
              </p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono font-bold text-xs shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Archivada</span>
          </div>
        </div>
      )}

      {/* Banner de Finalización y Aviso al Cliente */}
      {isFinished && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-950">
                ¡Vehículo Reparado y Listo para Entregar!
              </h3>
              <p className="text-xs text-emerald-800">
                Trabajo técnico concluido. Podés notificar al cliente o registrar la entrega para archivar la orden.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleNotifyClient}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#25D366]/20 transition-all shrink-0 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{notified ? "Aviso Enviado ✓" : "Avisar por WhatsApp"}</span>
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={handleMarkAsDelivered}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>Marcar como Entregado</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid Resumen: 2 Columnas y 2 Filas (Vehículo y Cliente / Mecánico y Estado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Fila 1 - Columna 1: Vehículo */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-sky-600" />
                <span>Vehículo</span>
              </span>
              <Link
                href={`/app/vehiculos/${order.vehicle.patente}`}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
              >
                <span>Historial Clínico</span>
                <span>→</span>
              </Link>
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="font-extrabold text-slate-900 text-base">
                {order.vehicle.marca} {order.vehicle.modelo}
              </p>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                  {order.vehicle.patente}
                </span>
                <span className="text-slate-500 font-medium">
                  Año {order.vehicle.anio} • Color: {order.vehicle.color || "S/D"}
                </span>
              </div>
              <p className="text-slate-500 pt-1">
                Km al ingresar: <strong className="text-slate-700">{order.kilometraje ? `${order.kilometraje.toLocaleString("es-AR")} km` : "No registrado"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Fila 1 - Columna 2: Propietario / Cliente */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-600" />
                <span>Cliente Propietario</span>
              </span>
              <Link
                href={`/app/clientes/${order.vehicle.client.id}`}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
              >
                <span>Ficha Cliente</span>
                <span>→</span>
              </Link>
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="font-extrabold text-slate-900 text-base">
                {order.vehicle.client.nombre} {order.vehicle.client.apellido}
              </p>
              <div className="flex items-center gap-2 flex-wrap text-slate-600">
                <span>DNI: <strong className="text-slate-800">{order.vehicle.client.dni}</strong></span>
                <span>•</span>
                <span>Tel: <strong className="text-slate-800">{order.vehicle.client.telefono || "Sin teléfono"}</strong></span>
              </div>
              <p className="text-slate-500 truncate pt-0.5">
                Email: {order.vehicle.client.email || "Sin email registrado"}
              </p>
            </div>
          </div>
        </div>

        {/* Fila 2 - Columna 1: Mecánico Asignado */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-sky-600" />
                <span>Mecánico Asignado</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  order.mechanic
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isClosed
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {order.mechanic ? "Asignado" : isClosed ? "Cerrado" : "Sin Asignar"}
              </span>
            </div>

            {order.mechanic ? (
              <div className="flex items-center gap-3.5 py-1">
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 font-black text-sm flex items-center justify-center shrink-0 border border-sky-200">
                  {order.mechanic.nombre.charAt(0)}
                  {order.mechanic.apellido ? order.mechanic.apellido.charAt(0) : ""}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 text-base truncate">
                    {order.mechanic.nombre} {order.mechanic.apellido || ""}
                  </p>
                  <p className="text-slate-500 text-xs truncate">
                    {order.mechanic.email || "Técnico Mecánico Responsable"}
                  </p>
                </div>
              </div>
            ) : isClosed ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-3 my-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Mecánica Concluida</p>
                  <p className="text-[11px] text-slate-500">Orden de trabajo finalizada y asentada en el historial.</p>
                </div>
              </div>
            ) : (
              <div
                className={`p-3.5 rounded-2xl flex items-center gap-3 my-0.5 border ${
                  order.estado === "EN_REPARACION" ||
                  order.estado === "EN_CURSO" ||
                  order.estado === "ESPERANDO_REPUESTOS" ||
                  order.estado === "EN_ESPERA_REPUESTOS"
                    ? "bg-rose-50 border-rose-300 text-rose-950"
                    : "bg-amber-50/70 border-amber-200/80 text-amber-900"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    order.estado === "EN_REPARACION" ||
                    order.estado === "EN_CURSO" ||
                    order.estado === "ESPERANDO_REPUESTOS" ||
                    order.estado === "EN_ESPERA_REPUESTOS"
                      ? "text-rose-600 animate-bounce"
                      : "text-amber-600"
                  }`}
                />
                <div className="text-xs">
                  <p className="font-bold">
                    {order.estado === "EN_REPARACION" ||
                    order.estado === "EN_CURSO" ||
                    order.estado === "ESPERANDO_REPUESTOS" ||
                    order.estado === "EN_ESPERA_REPUESTOS"
                      ? "⚠️ Acción Requerida: Sin mecánico asignado"
                      : "Sin técnico asignado"}
                  </p>
                  <p
                    className={`text-[11px] ${
                      order.estado === "EN_REPARACION" ||
                      order.estado === "EN_CURSO" ||
                      order.estado === "ESPERANDO_REPUESTOS" ||
                      order.estado === "EN_ESPERA_REPUESTOS"
                        ? "text-rose-700 font-semibold"
                        : "text-amber-700"
                    }`}
                  >
                    {order.estado === "EN_REPARACION" ||
                    order.estado === "EN_CURSO" ||
                    order.estado === "ESPERANDO_REPUESTOS" ||
                    order.estado === "EN_ESPERA_REPUESTOS"
                      ? "Un vehículo no puede estar en reparación sin un técnico responsable asignado."
                      : "Debe designarse un responsable para liderar la orden."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3.5 border-t border-slate-100 mt-2">
            {isClosed ? (
              <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 cursor-default">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Asignación Cerrada</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedMechanicToAssign(order.mechanicId || "");
                  setAssignModalOpen(true);
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  order.mechanic
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    : order.estado === "EN_REPARACION" ||
                      order.estado === "EN_CURSO" ||
                      order.estado === "ESPERANDO_REPUESTOS" ||
                      order.estado === "EN_ESPERA_REPUESTOS"
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 animate-pulse"
                    : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {order.mechanic
                    ? "Cambiar Mecánico"
                    : order.estado === "EN_REPARACION" ||
                      order.estado === "EN_CURSO" ||
                      order.estado === "ESPERANDO_REPUESTOS" ||
                      order.estado === "EN_ESPERA_REPUESTOS"
                    ? "Asignar Mecánico Requerido"
                    : "Asignar Mecánico"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Fila 2 - Columna 2: Estado de la Orden */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-sky-600" />
                <span>Estado de la Orden</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Ingreso: {new Date(order.fechaIngreso).toLocaleDateString("es-AR")}
              </span>
            </div>

            {(() => {
              const currentStatusKey =
                order.estado === "PENDIENTE"
                  ? "PENDIENTE_PERITAJE"
                  : order.estado === "EN_CURSO"
                  ? "EN_REPARACION"
                  : order.estado === "ESPERANDO_REPUESTOS"
                  ? "EN_ESPERA_REPUESTOS"
                  : order.estado === "ENTREGADO" || order.estado === "ARCHIVADO"
                  ? "ENTREGADO"
                  : order.estado;
              const statusInfo = getStatusInfo(order.estado);

              return (
                <div className="space-y-1.5 py-0.5">
                  <div className={`p-3 rounded-2xl border flex items-center gap-3 ${statusInfo.badgeClass}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-current shrink-0 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-sm block leading-tight">
                        {statusInfo.label}
                      </span>
                      <span className="text-xs opacity-80 block truncate mt-0.5">
                        {getStatusPhaseDescription(order.estado)}
                      </span>
                    </div>
                  </div>
                  {isEntregado && (
                    <span className="block text-[11px] text-center text-slate-500 font-semibold italic pt-1">
                      📦 Vehículo entregado al cliente • Orden archivada.
                    </span>
                  )}
                  {isFinished && (
                    <span className="block text-[11px] text-center text-emerald-700 font-semibold italic pt-1">
                      🏁 Reparación técnica concluida • Lista para entrega al cliente.
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="pt-3.5 border-t border-slate-100 mt-2">
            {(() => {
              const currentStatusKey =
                order.estado === "PENDIENTE" || order.estado === "INGRESADO"
                  ? "PENDIENTE_PERITAJE"
                  : order.estado === "EN_CURSO"
                  ? "EN_REPARACION"
                  : order.estado === "ESPERANDO_REPUESTOS"
                  ? "EN_ESPERA_REPUESTOS"
                  : order.estado === "ENTREGADO" || order.estado === "ARCHIVADO"
                  ? "ENTREGADO"
                  : order.estado;

              if (isEntregado) {
                return (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-default">
                    <PackageCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Vehículo Entregado (Archivada)</span>
                  </div>
                );
              }

              if (isFinished) {
                return (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={handleMarkAsDelivered}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Entregar Vehículo y Archivar Orden</span>
                  </button>
                );
              }

              if (currentStatusKey === "PENDIENTE_PERITAJE") {
                if (isMechanicOrAdmin) {
                  return (
                    <button
                      type="button"
                      onClick={() => setPeritajeModalOpen(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-sky-600/20 transition-all cursor-pointer"
                    >
                      <Wrench className="w-4 h-4 shrink-0" />
                      <span>Iniciar Peritaje Técnico</span>
                    </button>
                  );
                }
                return (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Aguardando peritaje del mecánico</span>
                  </div>
                );
              }

              if (currentStatusKey === "EN_REPARACION") {
                if (!isPeritajeRealizado) {
                  return (
                    <button
                      type="button"
                      onClick={() => setPeritajeModalOpen(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer animate-pulse"
                    >
                      <Wrench className="w-4 h-4 shrink-0" />
                      <span>Completar Peritaje Requerido</span>
                    </button>
                  );
                }

                if (!order.mechanicId && !order.mechanic) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMechanicToAssign("");
                        setAssignModalOpen(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer animate-pulse"
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>Asignar Mecánico Requerido</span>
                    </button>
                  );
                }

                if (isMechanicOrAdmin) {
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => handleStatusChange("EN_ESPERA_REPUESTOS")}
                        className="py-2.5 px-2 sm:px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Pausar trabajo a la espera de repuestos o insumos"
                      >
                        <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="truncate">Pausar Repuestos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFinalizarModalOpen(true)}
                        className="py-2.5 px-2 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">Marcar Listo</span>
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-sky-50/80 border border-sky-200/80 text-sky-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <Wrench className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="truncate">Trabajos técnicos en curso en taller</span>
                  </div>
                );
              }

              if (currentStatusKey === "EN_ESPERA_REPUESTOS") {
                if (!order.mechanicId && !order.mechanic) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMechanicToAssign("");
                        setAssignModalOpen(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer animate-pulse"
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>Asignar Mecánico Requerido</span>
                    </button>
                  );
                }

                if (isMechanicOrAdmin) {
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => handleStatusChange("EN_REPARACION")}
                        className="py-2.5 px-2 sm:px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <PlayCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">Reanudar Taller</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFinalizarModalOpen(true)}
                        className="py-2.5 px-2 sm:px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">Marcar Listo</span>
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">En espera de repuestos o insumos</span>
                  </div>
                );
              }

              return (
                <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-2">
                  <span>Estado: {getStatusInfo(order.estado).label}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Motivo de Ingreso */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Detalles de Recepción / Falla reportada:
        </h3>
        <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          {order.detallesIngreso}
        </p>
      </div>

      {/* SECCIÓN PERITAJE DE INGRESO Y DAÑOS PREVIOS (RESGUARDO LEGAL ANTE RECLAMOS) */}
      {(() => {
        let peritajeInfo: any = null;
        if (order.checklistDanio) {
          try {
            peritajeInfo = JSON.parse(order.checklistDanio);
          } catch {}
        }

        const daniosList = peritajeInfo?.daniosCarroceria || [];
        const activeTestigos = peritajeInfo?.lucesTestigo
          ? Object.entries(peritajeInfo.lucesTestigo).filter(([k, v]) => v === true && k !== "otrosTestigos").map(([k]) => k)
          : [];

        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Peritaje de Recepción y Daños Preexistentes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Constatación técnica probatoria al recibir el auto (protección legal ante reclamos).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPeritajeRealizado ? (
                  <button
                    type="button"
                    onClick={() => setPeritajeModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                    title="Ver Ficha de Peritaje Completa (Solo Lectura)"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ver Ficha de Peritaje Completa</span>
                  </button>
                ) : (
                  <>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Peritaje Pendiente</span>
                    </span>
                    {isMechanicOrAdmin ? (
                      <button
                        type="button"
                        onClick={() => setPeritajeModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Realizar Peritaje</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        (A realizarse por mecánico en taller)
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Peritaje Inicial del Dueño (Declaración de Daños Preexistentes) */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                    Peritaje Inicial del Dueño (Declaración de Daños)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                  {order.vehicle?.client ? `${order.vehicle.client.nombre} ${order.vehicle.client.apellido}` : "Propietario"}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium italic bg-white p-3 rounded-xl border border-amber-200">
                {order.comentariosDuenio?.trim() || peritajeInfo?.comentariosDuenio?.trim() ? (
                  <span>&ldquo;{order.comentariosDuenio?.trim() || peritajeInfo?.comentariosDuenio?.trim()}&rdquo;</span>
                ) : (
                  <span className="text-slate-400 not-italic">
                    El cliente no manifestó abolladuras o desperfectos específicos al momento de dejar el vehículo en recepción.
                  </span>
                )}
              </p>
            </div>

            {/* Peritaje Técnico Profundo realizado por el Mecánico */}
            {isPeritajeRealizado ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Luces Testigo */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Luces Testigo en Tablero (Fallas Previas):
                  </span>
                  {activeTestigos.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeTestigos.map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                          🔴 {t.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      Sin testigos de anomalía encendidos reportados al ingresar.
                    </p>
                  )}
                </div>

                {/* Daños en Carrocería */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Golpes, Abolladuras y Rayones Preexistentes ({daniosList.length}):
                  </span>
                  {daniosList.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {daniosList.map((d: any, idx: number) => (
                        <div key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <span className="font-bold text-rose-700 shrink-0">• [{d.zona}]:</span>
                          <span>{d.descripcion} ({d.tipo?.replace(/_/g, " ")})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      No se declararon daños estéticos significativos en el peritaje técnico.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-xs font-extrabold text-slate-800">
                  Peritaje Técnico Profundo Pendiente
                </h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  {isMechanicOrAdmin
                    ? "El mecánico debe realizar la inspección técnica (testigos de tablero, carrocería y fotos de constatación) para dejar asentado el estado de ingreso y habilitar el Acta Legal descargable."
                    : "El peritaje técnico profundo debe ser realizado por el mecánico asignado o administración. Recepción no tiene permisos técnicos para emitir este dictamen."}
                </p>
                {isMechanicOrAdmin ? (
                  <button
                    type="button"
                    onClick={() => setPeritajeModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Realizar Peritaje</span>
                  </button>
                ) : (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>A cargo exclusivo de Mecánico o Administración</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* SECCIÓN BITÁCORA Y NOTAS DIARIAS DEL PROCESO DE ARREGLO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bitácora y Notas Diarias del Proceso de Arreglo
              </h2>
              <p className="text-xs text-slate-500">
                Registro cronológico asentado por los mecánicos durante la resolución del motivo de consulta.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {order.workLogs.length} {order.workLogs.length === 1 ? "nota registrada" : "notas registradas"}
          </span>
        </div>

        {order.workLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">Aún no se han asentado notas diarias de trabajo</p>
            <p className="text-[11px] text-slate-400 mt-1">
              El mecánico asignado registrará aquí los avances diarios en la reparación del vehículo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {order.workLogs.map((log: any, idx: number) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">
                      #{order.workLogs.length - idx}
                    </span>
                    <span className="font-extrabold text-slate-800">
                      🔧 {log.mechanic ? `${log.mechanic.nombre} ${log.mechanic.apellido || ""}` : "Mecánico"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.fechaRegistro).toLocaleString("es-AR")}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-medium pl-8 leading-relaxed whitespace-pre-wrap">
                  {log.descripcionTarea}
                </p>

                {log.horasInvertidas > 0 && (
                  <div className="pl-8 pt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                      ⏱️ {log.horasInvertidas} hs computadas
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN MULTIMEDIA Y EVIDENCIA EN OBJECT STORAGE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Evidencias Multimedia en la Nube</h2>
              <p className="text-xs text-slate-500">
                Fotos y peritajes resguardados en Object Storage independiente de la base de datos relacional.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {order.multimedia.length} archivos
          </span>
        </div>

        {order.multimedia.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No se han registrado fotografías de evidencia para este vehículo.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {order.multimedia.map((item: any) => (
              <div
                key={item.id}
                onClick={() => setActiveModalImg(item.urlStorage)}
                className="relative rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-900 aspect-video shadow-sm"
              >
                <img
                  src={item.urlStorage}
                  alt={item.descripcion || "Evidencia"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {item.etiqueta || item.tipo}
                  </span>
                  <p className="text-[10px] text-slate-300 truncate">
                    {item.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FOTO FULL VIEW */}
      {activeModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveModalImg(null)}
        >
          <div className="max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <img
              src={activeModalImg}
              alt="Evidencia Full"
              className="rounded-2xl max-w-full max-h-[80vh] object-contain shadow-2xl"
            />
            <button
              onClick={() => setActiveModalImg(null)}
              className="mt-4 px-6 py-2 rounded-full bg-white text-slate-900 font-bold text-xs shadow-lg"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

      {/* Modal de Peritaje Digital de Ingreso (100% Local) */}
      {order && (
        <PeritajeIngresoModal
          order={order}
          isOpen={peritajeModalOpen}
          onClose={() => setPeritajeModalOpen(false)}
          onSaved={() => fetchOrder()}
          isMechanic={isMechanic}
          readOnly={
            isPeritajeRealizado ||
            !isMechanicOrAdmin ||
            (order.estado !== "PENDIENTE" &&
              order.estado !== "PENDIENTE_PERITAJE" &&
              order.estado !== "INGRESADO")
          }
        />
      )}

      {/* Modal de Cierre y Finalización de Reparación */}
      {order && (
        <FinalizarReparacionModal
          isOpen={isFinalizarModalOpen}
          onClose={() => setIsFinalizarModalOpen(false)}
          order={order}
          onSuccess={(updatedOrder) => {
            setOrder(updatedOrder);
            fetchOrder();
          }}
        />
      )}

      {/* Modal para Asignar Mecánico Responsable */}
      {assignModalOpen && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-900 to-sky-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <UserCheck className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Asignar Mecánico Responsable
                  </h3>
                  <p className="text-xs text-sky-200/80">
                    Orden #{order.numeroOrden} • {order.vehicle?.marca} {order.vehicle?.modelo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Seleccione el profesional técnico responsable de realizar el peritaje inicial y gestionar las reparaciones del vehículo:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {mechanics.map((m) => {
                  const isSelected = selectedMechanicToAssign === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMechanicToAssign(m.id)}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.nombre.charAt(0)}{m.apellido ? m.apellido.charAt(0) : ""}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {m.nombre} {m.apellido || ""}
                          </p>
                          <p className="text-[11px] text-slate-500">{m.email}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}

                {/* Opción desasignar */}
                <div
                  onClick={() => setSelectedMechanicToAssign("")}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    selectedMechanicToAssign === ""
                      ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Dejar sin asignar</p>
                      <p className="text-[11px] text-slate-500">
                        La orden quedará pendiente de designación
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMechanicToAssign === ""
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {selectedMechanicToAssign === "" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={handleConfirmAssignMechanic}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {assigning ? "Guardando..." : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal propio del sistema para confirmación de entrega y archivado */}
      <ConfirmDeliveryModal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        onConfirm={handleConfirmDelivery}
        loading={delivering}
        orderInfo={
          order
            ? {
                numeroOrden: order.numeroOrden,
                marca: order.vehicle?.marca,
                modelo: order.vehicle?.modelo,
                patente: order.vehicle?.patente,
                clienteNombre: `${order.vehicle?.client?.nombre || ""} ${order.vehicle?.client?.apellido || ""}`.trim(),
                clienteTelefono: order.vehicle?.client?.telefono,
              }
            : null
        }
      />
    </div>
  );
}


