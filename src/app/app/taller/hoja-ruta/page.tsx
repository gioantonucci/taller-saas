"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  CheckCircle2,
  Fuel,
  Car,
  ChevronLeft,
  Search,
  RefreshCw,
  AlertTriangle,
  Camera,
  Plus,
  Eye,
  Check,
  PauseCircle,
  PlayCircle,
  Gauge,
  Lock,
  ArrowRight,
  Phone,
  MessageCircle,
  Minus,
  AlertCircle,
} from "lucide-react";
import PeritajeIngresoModal from "@/components/PeritajeIngresoModal";
import FinalizarReparacionModal from "@/components/FinalizarReparacionModal";
import { matchesSearchMulti } from "@/lib/search-utils";
import { getStatusInfo } from "@/lib/order-status";
import { useAppDialog } from "@/components/AppDialog";

// Los 4 estados clave del flujo del taller
const CORE_STATUSES = [
  {
    id: "PENDIENTE",
    step: 1,
    label: "1. En Peritaje",
    shortLabel: "Peritaje",
    subtitle: "Inspección de recepción",
    color: "bg-rose-500 text-white",
    border: "border-rose-400",
    light: "bg-rose-50 text-rose-700 border-rose-200",
    icon: "📋",
  },
  {
    id: "EN_CURSO",
    step: 2,
    label: "2. En Reparación",
    shortLabel: "Reparación",
    subtitle: "Trabajo activo en taller",
    color: "bg-blue-600 text-white",
    border: "border-blue-400",
    light: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "🔧",
  },
  {
    id: "ESPERANDO_REPUESTOS",
    step: 3,
    label: "3. Espera Repuestos",
    shortLabel: "Repuestos",
    subtitle: "Pausado por piezas",
    color: "bg-amber-500 text-white",
    border: "border-amber-400",
    light: "bg-amber-50 text-amber-700 border-amber-200",
    icon: "⏸️",
  },
  {
    id: "FINALIZADO",
    step: 4,
    label: "4. Listo",
    shortLabel: "Listo",
    subtitle: "Listo para entrega",
    color: "bg-emerald-600 text-white",
    border: "border-emerald-400",
    light: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "✅",
  },
] as const;

// Sugerencias rápidas táctiles para el mecánico
const QUICK_TASKS = [
  "Cambio de pastillas delanteras",
  "Cambio de aceite y filtros",
  "Revisión de tren delantero",
  "Alineación y balanceo",
  "Diagnóstico computarizado",
  "Reparación de suspensión",
  "Purgado de sistema de frenos",
  "Sustitución de correa y tensores",
  "Reparación de embrague",
  "Prueba de ruta satisfactoria",
];

const QUICK_HOURS = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0];

export default function HojaRutaMecanicoPage() {
  const { alert, confirm } = useAppDialog();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [peritajeModalOpen, setPeritajeModalOpen] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [orderToFinalize, setOrderToFinalize] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Estados para Registro de Horas (WorkLog)
  const [horasInput, setHorasInput] = useState("1.0");
  const [tareaInput, setTareaInput] = useState("");
  const [savingWorkLog, setSavingWorkLog] = useState(false);
  const [workLogSuccess, setWorkLogSuccess] = useState(false);

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

  const isCancelledOrder = (order: any) => {
    return Boolean(
      order &&
      (order.estado === "CANCELADO" ||
        order.motivoCancelacion ||
        (() => {
          try {
            const parsed =
              typeof order.checklistDanio === "string"
                ? JSON.parse(order.checklistDanio)
                : order.checklistDanio;
            return Boolean(parsed?.motivoCancelacion);
          } catch {
            return false;
          }
        })())
    );
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/work-orders?scope=mine");
      if (res.ok) {
        const data = await res.json();
        const activeOrders = (data.orders || []).filter(
          (o: any) => !isCancelledOrder(o) && o.estado !== "CANCELADO" && o.estado !== "ENTREGADO" && o.estado !== "ARCHIVADO"
        );
        setOrders(activeOrders);
        if (selectedOrder) {
          const fresh = activeOrders.find((o: any) => o.id === selectedOrder.id);
          if (fresh) syncSelectedOrder(fresh);
          else setSelectedOrder(null);
        }
      }
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
    } finally {
      setLoading(false);
    }
  };

  const syncSelectedOrder = (order: any) => {
    setSelectedOrder(order);
  };

  useEffect(() => {
    fetchOrders();
    fetchCurrentUser();
  }, []);

  const handleFinalizarSuccess = (updatedOrder: any) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      syncSelectedOrder(updatedOrder);
    }
  };

  // Determinar si la orden seleccionada tiene el peritaje técnico completado
  const selectedOrderHasPeritaje = Boolean(
    selectedOrder?.checklistDanio &&
      (() => {
        try {
          const p =
            typeof selectedOrder.checklistDanio === "string"
              ? JSON.parse(selectedOrder.checklistDanio)
              : selectedOrder.checklistDanio;
          return Boolean(
            p &&
              (p.fechaHoraPeritaje ||
                p.fechaHoraCheckin ||
                p.estadoPeritaje === "COMPLETADO" ||
                p.estadoPeritaje === "CERRADO" ||
                p.cerrado === true ||
                (Array.isArray(p.damagePins) && p.damagePins.length > 0) ||
                (Array.isArray(p.daniosCarroceria) && p.daniosCarroceria.length > 0) ||
                p.rayones)
          );
        } catch {
          return false;
        }
      })()
  );

  // Determinar si la orden está en etapa inicial de peritaje (si no tiene peritaje o si su estado es de peritaje)
  const isSelectedOrderInPeritaje = Boolean(
    selectedOrder &&
      (!selectedOrderHasPeritaje ||
        selectedOrder.estado === "PENDIENTE" ||
        selectedOrder.estado === "PENDIENTE_PERITAJE" ||
        selectedOrder.estado === "INGRESADO")
  );

  const isSelectedOrderInReparacion = Boolean(
    selectedOrder &&
      selectedOrderHasPeritaje &&
      (selectedOrder.estado === "EN_CURSO" ||
        selectedOrder.estado === "EN_REPARACION" ||
        selectedOrder.estado === "PERITADO")
  );

  const isSelectedOrderInEsperaRepuestos = Boolean(
    selectedOrder &&
      selectedOrderHasPeritaje &&
      (selectedOrder.estado === "ESPERANDO_REPUESTOS" ||
        selectedOrder.estado === "EN_ESPERA_REPUESTOS" ||
        selectedOrder.estado === "DETENIDO")
  );

  const isSelectedOrderTerminado = Boolean(
    selectedOrder &&
      selectedOrderHasPeritaje &&
      (selectedOrder.estado === "FINALIZADO" ||
        selectedOrder.estado === "TERMINADO" ||
        selectedOrder.estado === "REPARADO")
  );

  const isEncargado = Boolean(
    currentUser &&
      (currentUser.role === "ADMIN" ||
        currentUser.role === "RECEPCION" ||
        currentUser.role === "RECEPTION")
  );

  const selectedOrderControlCalidad = (() => {
    if (!selectedOrder?.checklistDanio) return null;
    try {
      const p =
        typeof selectedOrder.checklistDanio === "string"
          ? JSON.parse(selectedOrder.checklistDanio)
          : selectedOrder.checklistDanio;
      return p?.controlCalidadSalida || null;
    } catch {
      return null;
    }
  })();

  // Actualizar estado de la orden
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const targetOrder =
      selectedOrder?.id === orderId
        ? selectedOrder
        : orders.find((o) => o.id === orderId);

    if (targetOrder) {
      const isTargetRepair =
        newStatus === "EN_CURSO" ||
        newStatus === "EN_REPARACION" ||
        newStatus === "ESPERANDO_REPUESTOS" ||
        newStatus === "EN_ESPERA_REPUESTOS" ||
        newStatus === "FINALIZADO" ||
        newStatus === "TERMINADO";

      if (isTargetRepair) {
        if (!targetOrder.mechanicId && !targetOrder.mechanic) {
          await alert({
            title: "Mecánico Responsable Requerido",
            message: "Un vehículo no puede estar en reparación sin un mecánico responsable asignado. Debe designar un técnico para liderar los trabajos.",
            variant: "warning",
            icon: "warning",
          });
          return;
        }

        // REGLA DE NEGOCIO ESTRICTA: No puede llegar al punto de reparación sin peritaje
        let hasPeritaje = false;
        if (targetOrder.checklistDanio) {
          try {
            const p =
              typeof targetOrder.checklistDanio === "string"
                ? JSON.parse(targetOrder.checklistDanio)
                : targetOrder.checklistDanio;
            hasPeritaje = Boolean(
              p &&
                (p.fechaHoraPeritaje ||
                  p.fechaHoraCheckin ||
                  p.estadoPeritaje === "COMPLETADO" ||
                  p.estadoPeritaje === "CERRADO" ||
                  p.cerrado === true ||
                  (Array.isArray(p.damagePins) && p.damagePins.length > 0) ||
                  (Array.isArray(p.daniosCarroceria) && p.daniosCarroceria.length > 0) ||
                  p.rayones)
            );
          } catch {
            hasPeritaje = false;
          }
        }

        if (!hasPeritaje) {
          await alert({
            title: "Peritaje Previo Requerido",
            message: "No se puede avanzar al punto de reparación sin haber realizado previamente el peritaje técnico de ingreso.",
            variant: "warning",
            icon: "warning",
          });
          setPeritajeModalOpen(true);
          return;
        }
      }

      if (newStatus === "FINALIZADO" || newStatus === "TERMINADO") {
        setOrderToFinalize(targetOrder);
        setFinalizarModalOpen(true);
        return;
      }
    }

    setSavingStatus(true);
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "Error al actualizar estado",
          message: data.error || "No se pudo actualizar el estado de la orden.",
          variant: "danger",
        });
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        syncSelectedOrder(data.order);
      }
    } catch (err) {
      console.error("Error actualizando estado:", err);
      await alert({
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor al actualizar el estado.",
        variant: "danger",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  // Cargar registro de horas (WorkLog)
  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaInput.trim() || !selectedOrder) return;

    if (!selectedOrderHasPeritaje) {
      await alert({
        title: "Peritaje Requerido",
        message: "Debe realizar el peritaje técnico de ingreso antes de poder registrar tareas mecánicas.",
        variant: "warning",
        icon: "warning",
      });
      setPeritajeModalOpen(true);
      return;
    }

    setSavingWorkLog(true);
    try {
      const res = await fetch(`/api/work-orders/${selectedOrder.id}/work-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horasInvertidas: horasInput,
          descripcionTarea: tareaInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "Error al registrar tarea",
          message: data.error || "No se pudo registrar la tarea en la orden.",
          variant: "danger",
        });
        return;
      }

      setTareaInput("");
      setHorasInput("1.0");
      setWorkLogSuccess(true);
      setTimeout(() => setWorkLogSuccess(false), 3000);

      const orderRes = await fetch(`/api/work-orders/${selectedOrder.id}`);
      if (orderRes.ok) {
        const updated = await orderRes.json();
        syncSelectedOrder(updated.order);
      }
    } catch (err) {
      console.error("Error registrando horas:", err);
      await alert({
        title: "Error de conexión",
        message: "Ocurrió un error al intentar registrar las horas de trabajo.",
        variant: "danger",
      });
    } finally {
      setSavingWorkLog(false);
    }
  };



  // Filtrado de órdenes activas (excluye canceladas y archivadas)
  const filteredOrders = orders.filter((o) => {
    if (isCancelledOrder(o) || o.estado === "CANCELADO" || o.estado === "ENTREGADO" || o.estado === "ARCHIVADO") {
      return false;
    }

    if (searchQuery.trim()) {
      const matchesSearch = matchesSearchMulti(
        [
          o.vehicle?.patente,
          o.vehicle?.modelo,
          o.vehicle?.marca,
          o.vehicle?.client?.nombre,
          o.vehicle?.client?.apellido,
          o.numeroOrden,
          o.detallesIngreso,
        ],
        searchQuery
      );
      if (!matchesSearch) return false;
    }

    if (statusFilter === "TODOS") {
      return true;
    }
    if (statusFilter === "PENDIENTE") {
      return o.estado === "PENDIENTE" || o.estado === "PENDIENTE_PERITAJE" || o.estado === "INGRESADO";
    }
    if (statusFilter === "EN_CURSO") {
      return o.estado === "EN_CURSO" || o.estado === "EN_REPARACION" || o.estado === "PERITADO";
    }
    if (statusFilter === "ESPERANDO_REPUESTOS") {
      return o.estado === "ESPERANDO_REPUESTOS" || o.estado === "EN_ESPERA_REPUESTOS" || o.estado === "DETENIDO";
    }
    if (statusFilter === "FINALIZADO") {
      return o.estado === "FINALIZADO" || o.estado === "TERMINADO" || o.estado === "REPARADO";
    }
    return true;
  });

  // Conteo de órdenes activas (excluye canceladas y archivadas)
  const activeOrdersForCounts = orders.filter(
    (o) => !isCancelledOrder(o) && o.estado !== "CANCELADO" && o.estado !== "ENTREGADO" && o.estado !== "ARCHIVADO"
  );

  const counts = {
    total: activeOrdersForCounts.length,
    pendiente: activeOrdersForCounts.filter((o) => o.estado === "PENDIENTE" || o.estado === "PENDIENTE_PERITAJE" || o.estado === "INGRESADO").length,
    enCurso: activeOrdersForCounts.filter((o) => o.estado === "EN_CURSO" || o.estado === "EN_REPARACION" || o.estado === "PERITADO").length,
    esperandoRepuestos: activeOrdersForCounts.filter((o) => o.estado === "ESPERANDO_REPUESTOS" || o.estado === "EN_ESPERA_REPUESTOS" || o.estado === "DETENIDO").length,
    finalizado: activeOrdersForCounts.filter((o) => o.estado === "FINALIZADO" || o.estado === "TERMINADO" || o.estado === "REPARADO").length,
  };

  const totalHorasInvertidas =
    selectedOrder?.workLogs?.reduce((acc: number, log: any) => acc + (log.horasInvertidas || 0), 0) || 0;

  // Extraer peritaje parseado para la vista rápida
  const parsedPeritajeInfo = (() => {
    if (!selectedOrder?.checklistDanio) return null;
    try {
      return typeof selectedOrder.checklistDanio === "string"
        ? JSON.parse(selectedOrder.checklistDanio)
        : selectedOrder.checklistDanio;
    } catch {
      return null;
    }
  })();

  // REGLA DE NEGOCIO: El peritaje técnico de ingreso es inmutable una vez cerrado
  const isSelectedOrderPeritajeCerrado = Boolean(
    selectedOrder &&
      (
        (selectedOrder.estado !== "PENDIENTE" &&
          selectedOrder.estado !== "PENDIENTE_PERITAJE" &&
          selectedOrder.estado !== "INGRESADO") ||
        Boolean(
          parsedPeritajeInfo &&
            (parsedPeritajeInfo.cerrado === true ||
              parsedPeritajeInfo.estadoPeritaje === "COMPLETADO" ||
              parsedPeritajeInfo.estadoPeritaje === "CERRADO" ||
              parsedPeritajeInfo.fechaCierre ||
              parsedPeritajeInfo.fechaHoraPeritaje)
        )
      )
  );

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto sm:max-w-4xl space-y-4 pb-24 px-2 sm:px-4">
      {/* ========================================================================= */}
      {/* VISTA 1: TABLERO / LISTADO DE AUTOS EN TALLER                             */}
      {/* ========================================================================= */}
      {!selectedOrder ? (
        <div className="space-y-4">
          {/* Header Superior del Taller */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner border border-sky-500/30">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                    Módulo de Taller
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                    Hoja de Ruta
                  </h1>
                  <p className="text-xs text-sky-300 font-medium mt-0.5">
                    Panel Táctil para Mecánicos • {counts.total} autos en taller
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchOrders}
                className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Actualizar listado de autos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Chips de Conteo y Filtro por Estado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "PENDIENTE" ? "TODOS" : "PENDIENTE")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "PENDIENTE"
                    ? "bg-rose-500 text-white border-rose-400 shadow-md ring-2 ring-rose-400/30"
                    : "bg-slate-800/70 text-rose-300 border-rose-900/60 hover:bg-slate-800"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">📋 En Peritaje</div>
                <div className="text-xl font-black mt-0.5">{counts.pendiente}</div>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "EN_CURSO" ? "TODOS" : "EN_CURSO")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "EN_CURSO"
                    ? "bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/30"
                    : "bg-slate-800/70 text-blue-300 border-blue-900/60 hover:bg-slate-800"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">🔧 En Reparación</div>
                <div className="text-xl font-black mt-0.5">{counts.enCurso}</div>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "ESPERANDO_REPUESTOS" ? "TODOS" : "ESPERANDO_REPUESTOS")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "ESPERANDO_REPUESTOS"
                    ? "bg-amber-500 text-white border-amber-400 shadow-md ring-2 ring-amber-400/30"
                    : "bg-slate-800/70 text-amber-300 border-amber-900/60 hover:bg-slate-800"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">⏸️ Espera Repuesto</div>
                <div className="text-xl font-black mt-0.5">{counts.esperandoRepuestos}</div>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "FINALIZADO" ? "TODOS" : "FINALIZADO")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "FINALIZADO"
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30"
                    : "bg-slate-800/70 text-emerald-300 border-emerald-900/60 hover:bg-slate-800"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">✅ Listo</div>
                <div className="text-xl font-black mt-0.5">{counts.finalizado}</div>
              </button>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por patente, modelo o titular..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Píldoras de filtro */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
              <button
                type="button"
                onClick={() => setStatusFilter("TODOS")}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap border transition-colors cursor-pointer ${
                  statusFilter === "TODOS"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Todos ({counts.total})
              </button>
              {CORE_STATUSES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap border transition-colors cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {st.icon} {st.label} (
                  {st.id === "PENDIENTE"
                    ? counts.pendiente
                    : st.id === "EN_CURSO"
                    ? counts.enCurso
                    : st.id === "ESPERANDO_REPUESTOS"
                    ? counts.esperandoRepuestos
                    : counts.finalizado}
                  )
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Tarjetas de Autos */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 space-y-2">
              <Car className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No hay vehículos para este filtro</p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("TODOS");
                  setSearchQuery("");
                }}
                className="text-xs text-sky-600 font-semibold hover:underline cursor-pointer"
              >
                Ver todos los vehículos en taller
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const statusInfo = getStatusInfo(order.estado);
                const mediaCount = order.multimedia?.length || 0;
                const hoursCount =
                  order.workLogs?.reduce((acc: number, l: any) => acc + (l.horasInvertidas || 0), 0) || 0;

                const orderHasPeritaje = Boolean(
                  order.checklistDanio &&
                    (() => {
                      try {
                        const p =
                          typeof order.checklistDanio === "string"
                            ? JSON.parse(order.checklistDanio)
                            : order.checklistDanio;
                        return Boolean(
                          p &&
                            (p.fechaHoraPeritaje ||
                              p.fechaHoraCheckin ||
                              p.estadoPeritaje === "COMPLETADO" ||
                              p.estadoPeritaje === "CERRADO" ||
                              p.cerrado === true ||
                              (Array.isArray(p.damagePins) && p.damagePins.length > 0) ||
                              (Array.isArray(p.daniosCarroceria) && p.daniosCarroceria.length > 0) ||
                              p.rayones)
                        );
                      } catch {
                        return false;
                      }
                    })()
                );

                const isPeritaje =
                  !orderHasPeritaje ||
                  order.estado === "PENDIENTE" ||
                  order.estado === "PENDIENTE_PERITAJE" ||
                  order.estado === "INGRESADO";
                const isReparando =
                  orderHasPeritaje &&
                  (order.estado === "EN_CURSO" ||
                    order.estado === "EN_REPARACION" ||
                    order.estado === "PERITADO");
                const isEspera =
                  orderHasPeritaje &&
                  (order.estado === "ESPERANDO_REPUESTOS" ||
                    order.estado === "EN_ESPERA_REPUESTOS" ||
                    order.estado === "DETENIDO");
                const isTerminado =
                  orderHasPeritaje &&
                  (order.estado === "FINALIZADO" ||
                    order.estado === "TERMINADO" ||
                    order.estado === "REPARADO");

                return (
                  <div
                    key={order.id}
                    onClick={() => syncSelectedOrder(order)}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3.5 transition-all hover:shadow-md hover:border-slate-300 cursor-pointer group"
                  >
                    {/* Fila Superior: Patente Argentina Oficial, Auto y Estado */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          {/* Matrícula compacta */}
                          <div className="inline-flex items-center px-1.5 py-0.5 border border-slate-300 rounded-md bg-slate-100 text-slate-900 font-mono font-black text-[11px] tracking-wider select-none shrink-0 shadow-2xs">
                            {order.vehicle.patente}
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                            {order.vehicle.marca} {order.vehicle.modelo}
                          </h3>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                          Orden #{order.numeroOrden} • {order.vehicle.client.nombre} {order.vehicle.client.apellido || ""}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 text-center uppercase tracking-tight whitespace-nowrap ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Motivo del Ingreso / Diagnóstico */}
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                      <span className="font-bold text-slate-900 block text-[11px] mb-0.5">
                        Motivo / Falla reportada:
                      </span>
                      <p className="line-clamp-2 text-slate-600">{order.detallesIngreso || "Mantenimiento general."}</p>
                    </div>

                    {/* Barra de Indicadores y Botón Principal de Acción Directa */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-amber-500" />
                          {order.nivelNafta || "1/2"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-sky-600" />
                          {mediaCount} fotos
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          {hoursCount} hs
                        </span>
                      </div>

                      {/* Botón de Acción Guiada según la etapa */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncSelectedOrder(order);
                        }}
                        className={`w-full sm:w-auto justify-center px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                          isPeritaje
                            ? "bg-rose-600 hover:bg-rose-500 text-white"
                            : isReparando
                            ? "bg-sky-600 hover:bg-sky-500 text-white"
                            : isEspera
                            ? "bg-amber-600 hover:bg-amber-500 text-white"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        {isPeritaje && <span>Peritar Auto</span>}
                        {isReparando && <span>Cargar Tareas</span>}
                        {isEspera && <span>Ver Espera</span>}
                        {isTerminado && <span>Ver Ficha</span>}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA 2: FICHA DE TRABAJO DEL AUTO SELECCIONADO (GUIADA + PESTAÑAS)      */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Barra de Retorno y Título Superior */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Volver a la Hoja de Ruta</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-sky-800 bg-sky-100 px-3 py-1 rounded-xl border border-sky-200 tracking-wider">
                ORDEN #{selectedOrder.numeroOrden}
              </span>
              <button
                type="button"
                onClick={fetchOrders}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Refrescar datos del auto"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tarjeta Resumen Fija del Vehículo */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Vehículo en Taller
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Ingresó: {new Date(selectedOrder.fechaIngreso).toLocaleDateString("es-AR")}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {selectedOrder.vehicle.marca} {selectedOrder.vehicle.modelo}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Matrícula compacta */}
                <div className="inline-flex items-center px-2.5 py-0.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-900 font-mono font-black text-xs tracking-wider select-none shadow-2xs">
                  {selectedOrder.vehicle.patente}
                </div>

                {/* Badge de Estado Actual */}
                <span
                  className={`text-[11px] font-black px-3 py-1 rounded-full border text-center uppercase tracking-tight shadow-xs ${
                    getStatusInfo(selectedOrder.estado).badgeClass
                  }`}
                >
                  {getStatusInfo(selectedOrder.estado).label}
                </span>
              </div>
            </div>

            {/* Datos Técnicos y Contacto Directo */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Año / Color</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedOrder.vehicle.anio} • {selectedOrder.vehicle.color || "s/d"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Nafta</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedOrder.nivelNafta || "1/2"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Odómetro</span>
                  <span className="font-bold font-mono text-slate-800 truncate block mt-0.5">
                    {selectedOrder.kilometraje ? `${Number(selectedOrder.kilometraje).toLocaleString("es-AR")} km` : "s/d"}
                  </span>
                </div>
              </div>

              <div className="col-span-3 sm:col-span-1 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Titular</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedOrder.vehicle.client.nombre} {selectedOrder.vehicle.client.apellido || ""}
                  </span>
                </div>
                {selectedOrder.vehicle.client.telefono && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${selectedOrder.vehicle.client.telefono}`}
                      className="p-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-700 transition-colors shadow-2xs"
                      title="Llamar al cliente"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${selectedOrder.vehicle.client.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola ${selectedOrder.vehicle.client.nombre}, te contactamos desde el taller mecánico sobre tu vehículo ${selectedOrder.vehicle.marca} ${selectedOrder.vehicle.modelo} (Orden #${selectedOrder.numeroOrden}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white transition-colors shadow-2xs"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Motivo de Consulta Reportado */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block text-[11px] mb-0.5">
                Motivo de Ingreso / Tarea a Realizar:
              </span>
              <p className="leading-relaxed text-slate-600">
                {selectedOrder.detallesIngreso || "Mantenimiento general y diagnóstico."}
              </p>
            </div>

            {selectedOrder.comentariosDuenio?.trim() && (
              <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-200/90 text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Declaración inicial de daños del dueño (Solo lectura):</span>
                </div>
                <p className="font-semibold text-slate-800 italic pl-5">
                  &ldquo;{selectedOrder.comentariosDuenio.trim()}&rdquo;
                </p>
              </div>
            )}

            {/* Peritaje Registrado: Resumen con botón de Ver Ficha para el Mecánico */}
            {isSelectedOrderPeritajeCerrado && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-white">
                        Peritaje de Ingreso Registrado
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Solo Lectura
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      {parsedPeritajeInfo?.peritadorNombre ? `Peritado por ${parsedPeritajeInfo.peritadorNombre}` : "Constatación legal completada"} • Solo Consulta
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPeritajeModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Peritaje</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TARJETA DE ACCIÓN GUIADA SEGÚN LA ETAPA (PASO A PASO OBLIGATORIO)         */}
          {/* ========================================================================= */}
          <div className="rounded-3xl p-4 sm:p-5 shadow-sm border space-y-3 transition-all bg-white border-slate-200">
            {/* ETAPA 1: PENDIENTE DE PERITAJE */}
            {isSelectedOrderInPeritaje && (
              <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-rose-200/80 rounded-2xl p-4 text-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm text-lg">
                    📋
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                        Etapa 1: Inspección de Ingreso
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Paso Requerido
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900">
                      Peritaje Pendiente
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Registrá los daños de carrocería, testigos del tablero y fotos para habilitar la reparación técnica.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPeritajeModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <span>Comenzar Peritaje de Ingreso</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ETAPA 2: EN REPARACIÓN */}
            {isSelectedOrderInReparacion && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-4 text-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm text-lg">
                    🔧
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        Etapa 2: Reparación Activa
                      </span>
                      <span className="text-[11px] font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200/60 font-mono">
                        {totalHorasInvertidas} hs acumuladas
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900">
                      Trabajo Mecánico en Taller
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Cargá tareas y horas en el WorkLog. Podés pausar si faltan piezas o finalizar al concluir.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "ESPERANDO_REPUESTOS")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 active:scale-[0.99] font-bold text-xs shadow-xs transition-all cursor-pointer"
                    title="Pausar trabajo mientras llegan repuestos"
                  >
                    <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Pausar por Repuestos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderToFinalize(selectedOrder);
                      setFinalizarModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    title="Marcar reparación concluida y lista para entrega"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>Finalizar Reparación</span>
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: ESPERANDO REPUESTOS */}
            {isSelectedOrderInEsperaRepuestos && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 text-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm text-lg">
                    ⏸️
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Etapa 3: Trabajo Pausado
                      </span>
                      <span className="text-[10px] font-bold text-amber-700">
                        Aguardando repuestos
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900">
                      En Espera de Repuestos o Insumos
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Cuando lleguen las piezas necesarias, reanudá el trabajo para continuar con la mecánica.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleUpdateStatus(selectedOrder.id, "EN_CURSO")}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <PlayCircle className="w-4 h-4 text-white" />
                  <span>Reanudar Reparación en Taller</span>
                </button>
              </div>
            )}

            {/* ETAPA 4: FINALIZADO */}
            {isSelectedOrderTerminado && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mb-1">
                        Etapa 4: Reparación Concluida
                      </span>
                      <h4 className="font-black text-sm text-emerald-950">
                        Vehículo Listo para Entrega al Cliente
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        El trabajo técnico concluyó exitosamente. Recepción puede realizar la entrega y archivo final.
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cerrada</span>
                  </div>
                </div>

                {/* Resumen de Control de Calidad y Salida */}
                {selectedOrderControlCalidad && (
                  <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Control de Calidad y Recordatorios de Salida
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                          ✓ Asentado en Orden
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">1. Reset servicio:</span>
                        <strong className={selectedOrderControlCalidad.realizoResetServicio ? "text-emerald-700" : "text-slate-700"}>
                          {selectedOrderControlCalidad.realizoResetServicio ? "✓ Realizado" : "✗ No"}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">2. Prueba carretera:</span>
                        <strong className={selectedOrderControlCalidad.condujoCarretera ? "text-emerald-700" : "text-slate-700"}>
                          {selectedOrderControlCalidad.condujoCarretera ? "✓ Se probó" : "✗ No"}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">3. Desperfecto:</span>
                        <strong className={selectedOrderControlCalidad.desperfectoSolucionado ? "text-emerald-700" : "text-amber-700"}>
                          {selectedOrderControlCalidad.desperfectoSolucionado ? "✓ Solucionado" : "⚠ Observaciones"}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">4. Desperfecto nuevo:</span>
                        <strong className={selectedOrderControlCalidad.desperfectoNuevoDetectado ? "text-rose-700" : "text-emerald-700"}>
                          {selectedOrderControlCalidad.desperfectoNuevoDetectado ? "⚠ Sí, detectado" : "✓ No"}
                        </strong>
                      </div>
                    </div>

                    {selectedOrderControlCalidad.desperfectoNuevoDetectado && selectedOrderControlCalidad.detalleNuevoDesperfecto && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950">
                        <strong className="block text-rose-900 text-[11px]">Observación de prueba:</strong>
                        {selectedOrderControlCalidad.detalleNuevoDesperfecto}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* REGISTRO DE TAREAS TÉCNICAS (WORKLOG OPERATIVO) CON CIERRE DE REPARACIÓN  */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Registro de Tareas Técnicas (WorkLog)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cargá los arreglos mecánicos y el tiempo dedicado a este auto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] uppercase font-extrabold text-indigo-700 tracking-wider">
                  Total Horas:
                </span>
                <span className="text-xs font-black text-indigo-950 font-mono">
                  {totalHorasInvertidas} hs
                </span>
              </div>
            </div>

            {/* Formulario de carga rápida si no está finalizado */}
            {isSelectedOrderTerminado ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 block text-sm">Orden de Trabajo Finalizada Técnicamente</span>
                    <p className="text-emerald-700 text-xs mt-0.5">
                      La reparación concluyó y fue cerrada. El vehículo se encuentra listo para entrega al cliente.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0 self-start sm:self-auto">
                  FINALIZADO
                </span>
              </div>
            ) : !selectedOrderHasPeritaje ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-950 block text-sm">
                      Peritaje Técnico de Ingreso Pendiente
                    </span>
                    <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                      El vehículo no puede ingresar en reparación ni recibir tareas o tiempos sin haber completado previamente la inspección técnica de ingreso.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPeritajeModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shrink-0 cursor-pointer shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Comenzar Peritaje Ahora</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddWorkLog} className="space-y-4">
                {/* Tarea con Carrusel de Sugerencias Táctiles */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Tarea o Arreglo Realizado:
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Tocá una sugerencia rápida ➔
                    </span>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Ej: Cambio de pastillas de freno delanteras y purgado"
                    value={tareaInput}
                    onChange={(e) => setTareaInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                  />

                  {/* Sugerencias en flex-wrap para que se vean prolijas y no cortadas */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {QUICK_TASKS.map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setTareaInput(quick)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all active:scale-95 cursor-pointer ${
                          tareaInput === quick
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-200/90 shadow-2xs"
                        }`}
                      >
                        + {quick}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horas Empleadas con Stepper Táctil y Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Tiempo Empleado:
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Paso ±0.5h o preset
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    {/* Stepper Numérico */}
                    <div className="flex items-center justify-between sm:justify-start rounded-2xl border border-slate-300 bg-white p-1 shadow-xs shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(0.5, (parseFloat(horasInput) || 1) - 0.5);
                          setHorasInput(val.toFixed(1));
                        }}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center font-black transition-all cursor-pointer"
                        title="Restar 0.5 horas"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="flex items-center px-4">
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          max="24"
                          value={horasInput}
                          onChange={(e) => setHorasInput(e.target.value)}
                          className="w-14 text-center text-base font-black font-mono text-slate-900 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-xs font-bold text-slate-400 ml-1">hs</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const val = (parseFloat(horasInput) || 0) + 0.5;
                          setHorasInput(val.toFixed(1));
                        }}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center font-black transition-all cursor-pointer"
                        title="Sumar 0.5 horas"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Presets Rápidos de Horas */}
                    <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 w-full flex-1">
                      {QUICK_HOURS.map((h) => {
                        const isSelected = parseFloat(horasInput) === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHorasInput(h.toFixed(1))}
                            className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border text-center transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs"
                            }`}
                          >
                            {h} hs
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={savingWorkLog}
                    className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingWorkLog ? "Guardando tarea..." : "Registrar Trabajo en WorkLog"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderToFinalize(selectedOrder);
                      setFinalizarModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalizar Reparación</span>
                  </button>
                </div>

                {workLogSuccess && (
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center animate-in fade-in">
                    ✅ Horas y tarea guardadas correctamente.
                  </div>
                )}
              </form>
            )}

            {/* Historial Cronológico de Tareas Computadas */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Historial de Tareas de esta Orden ({selectedOrder.workLogs?.length || 0}):
              </span>

              {selectedOrder.workLogs?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  Aún no se han registrado tareas mecánicas en esta orden.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedOrder.workLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between shadow-2xs hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="truncate pr-3">
                        <p className="font-extrabold text-slate-900 text-xs truncate">
                          {log.descripcionTarea}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {log.mechanic ? `${log.mechanic.nombre} ${log.mechanic.apellido || ""}` : "Mecánico"} •{" "}
                          {new Date(log.fechaRegistro).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-900 font-black text-xs shrink-0 shadow-2xs">
                        {log.horasInvertidas} hs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES DEL SISTEMA                                                      */}
      {/* ========================================================================= */}

      {/* Modal de Peritaje Completo de Ingreso */}
      {selectedOrder && (
        <PeritajeIngresoModal
          order={selectedOrder}
          isOpen={peritajeModalOpen}
          isMechanic={true}
          readOnly={isSelectedOrderPeritajeCerrado}
          onClose={() => setPeritajeModalOpen(false)}
          onSaved={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Modal de Finalización de Reparación (Cierre con horas y nota) */}
      <FinalizarReparacionModal
        isOpen={finalizarModalOpen}
        onClose={() => setFinalizarModalOpen(false)}
        order={orderToFinalize}
        onSuccess={handleFinalizarSuccess}
      />

    </div>
  );
}
