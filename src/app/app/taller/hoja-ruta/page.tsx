"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ModalPortal from "@/components/ModalPortal";
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
  Upload,
  X,
  Maximize2,
  Loader2,
  Image as ImageIcon,
  ClipboardList,
  Trash2,
  Video,
} from "lucide-react";
import { compressImageClient } from "@/lib/client-compress";
import PeritajeIngresoModal from "@/components/PeritajeIngresoModal";
import FinalizarReparacionModal from "@/components/FinalizarReparacionModal";
import PausaRepuestoModal from "@/components/PausaRepuestoModal";
import { matchesSearchMulti } from "@/lib/search-utils";
import { getStatusInfo } from "@/lib/order-status";
import { useAppDialog } from "@/components/AppDialog";

// Los 3 estados clave del flujo del taller mecánico activo
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
] as const;

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
  const [pausaRepuestoModalOpen, setPausaRepuestoModalOpen] = useState(false);
  const [orderToPause, setOrderToPause] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [mechanicFilter, setMechanicFilter] = useState<string>("TODOS");
  const [updatingMechanic, setUpdatingMechanic] = useState(false);

  // Estados para Registro de Tareas Técnicas (WorkLog) y Modal
  const [showAddWorkLog, setShowAddWorkLog] = useState(false);
  const [newWorkLogTarea, setNewWorkLogTarea] = useState("");
  const [newWorkLogHoras, setNewWorkLogHoras] = useState("1.0");
  const [newWorkLogFotos, setNewWorkLogFotos] = useState<string[]>([]);
  const [uploadingWorkLogPhoto, setUploadingWorkLogPhoto] = useState(false);
  const [activeModalImg, setActiveModalImg] = useState<string | null>(null);
  const [savingWorkLog, setSavingWorkLog] = useState(false);

  const handleUploadWorkLogPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingWorkLogPhoto(true);
    try {
      for (const file of files) {
        const isImage =
          file.type.startsWith("image/") ||
          /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name);
        const isVideo =
          file.type.startsWith("video/") ||
          /\.(mp4|webm|mov|m4v|3gp|3gpp|mkv|avi)$/i.test(file.name);

        if (!isImage && !isVideo) continue;

        let fileToUpload: File = file;
        if (isImage) {
          try {
            const comp = await compressImageClient(file, 1920, 1920, 0.8);
            fileToUpload = comp.file;
          } catch (compErr) {
            console.warn("Compresión no disponible:", compErr);
          }
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("folder", "arreglos");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status} al subir el archivo`);
        }

        const data = await res.json();
        const url = data.url || data.file?.url;
        if (url) {
          setNewWorkLogFotos((prev) => [...prev, url]);
        }
      }
    } catch (err: any) {
      console.error("Error al subir archivo de arreglo:", err);
      await alert({
        title: "Error al subir archivo",
        message: err.message || "No se pudo subir la foto o video del arreglo. Reintentá nuevamente.",
        variant: "danger",
      });
    } finally {
      setUploadingWorkLogPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

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

  const handleAssignMechanic = async (orderId: string, newMechanicId: string) => {
    setUpdatingMechanic(true);
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanicId: newMechanicId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "Error al asignar mecánico",
          message: data.error || "No se pudo actualizar el mecánico asignado.",
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
      console.error("Error al reasignar mecánico:", err);
      await alert({
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor para reasignar el mecánico.",
        variant: "danger",
      });
    } finally {
      setUpdatingMechanic(false);
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
        // En la hoja de trabajo del taller solo se muestran órdenes activas en proceso.
        // Si una orden fue finalizada (lista para retiro del cliente) o entregada/archivada/cancelada, no debe mostrarse aquí.
        const activeOrders = (data.orders || []).filter(
          (o: any) =>
            !isCancelledOrder(o) &&
            o.estado !== "CANCELADO" &&
            o.estado !== "ENTREGADO" &&
            o.estado !== "ARCHIVADO" &&
            o.estado !== "FINALIZADO" &&
            o.estado !== "TERMINADO" &&
            o.estado !== "REPARADO"
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
    fetchMechanics();
  }, []);

  const handleFinalizarSuccess = async (updatedOrder: any) => {
    // Al concluir la reparación, la orden pasa a recepción para retiro del cliente y se quita de la hoja de trabajo activa
    setOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(null);
    }
    await alert({
      title: "Reparación Finalizada",
      message: `La Orden #${updatedOrder.numeroOrden} ha concluido satisfactoriamente y quedó lista para retiro del cliente en recepción.`,
      variant: "success",
    });
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
              (p.cerrado === true ||
                p.estadoPeritaje === "COMPLETADO" ||
                p.estadoPeritaje === "CERRADO" ||
                Boolean(p.fechaCierre))
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
                (p.cerrado === true ||
                  p.estadoPeritaje === "COMPLETADO" ||
                  p.estadoPeritaje === "CERRADO" ||
                  Boolean(p.fechaCierre))
            );
          } catch {
            hasPeritaje = false;
          }
        }

        if (!hasPeritaje) {
          await alert({
            title: "Peritaje Previo Requerido",
            message: "No se puede empezar a reparar el vehículo sin cerrar el peritaje primero.",
            variant: "warning",
            icon: "warning",
          });
          setPeritajeModalOpen(true);
          return;
        }

        // Regla de especificación: La orden vuelve a En reparación solo si no queda ningún pedido de repuestos abierto
        if (newStatus === "EN_CURSO" || newStatus === "EN_REPARACION") {
          const openSpareRequests = (targetOrder.sparePartRequests || []).filter(
            (sp: any) => sp.estado !== "RECIBIDO" && sp.estado !== "CANCELADO" && sp.estado !== "RECIBIDO_TOTAL"
          );
          if (openSpareRequests.length > 0) {
            const pedidosList = openSpareRequests
              .map((sp: any) => `Pedido #${sp.id.slice(-4)} (${sp.estado})`)
              .join(", ");
            await alert({
              title: "Pedidos de Repuestos Pendientes",
              message: `No se puede reanudar la reparación técnica porque la orden tiene pedidos de repuestos abiertos: ${pedidosList}. Todos los pedidos deben estar en estado 'Recibido' o 'Cancelado'.`,
              variant: "warning",
              icon: "warning",
            });
            return;
          }
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

      if (
        newStatus === "FINALIZADO" ||
        newStatus === "TERMINADO" ||
        newStatus === "REPARADO" ||
        newStatus === "ENTREGADO" ||
        newStatus === "ARCHIVADO"
      ) {
        setOrders((prev) => prev.filter((o) => o.id !== data.order.id));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === data.order.id ? data.order : o))
        );

        if (selectedOrder && selectedOrder.id === orderId) {
          syncSelectedOrder(data.order);
        }
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

  // Guardar registro de trabajo técnico (WorkLog)
  const handleSaveWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkLogTarea.trim() || !selectedOrder) return;

    if (!selectedOrderHasPeritaje) {
      await alert({
        title: "Peritaje Requerido",
        message: "No se puede empezar a reparar el vehículo sin cerrar el peritaje primero.",
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
          horasInvertidas: newWorkLogHoras,
          descripcionTarea: newWorkLogTarea.trim(),
          fotos: newWorkLogFotos,
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

      // 1. Inyectamos de inmediato el log en la lista local para renderizado instantáneo
      if (data.log) {
        setSelectedOrder((prev: any) => {
          if (!prev) return prev;
          const currentLogs = prev.workLogs || [];
          return {
            ...prev,
            workLogs: [data.log, ...currentLogs.filter((l: any) => l.id !== data.log.id)],
          };
        });
      }

      // 2. Sincronizamos completamente la orden con la base de datos y la lista
      const orderRes = await fetch(`/api/work-orders/${selectedOrder.id}`);
      if (orderRes.ok) {
        const updated = await orderRes.json();
        syncSelectedOrder(updated.order);
        setOrders((prev) => prev.map((o) => (o.id === updated.order.id ? updated.order : o)));
      }

      // 3. Recién cuando la tarea ya está visible y renderizada en la lista, cerramos el modal y limpiamos campos
      setShowAddWorkLog(false);
      setNewWorkLogTarea("");
      setNewWorkLogHoras("1.0");
      setNewWorkLogFotos([]);
    } catch (err) {
      console.error("Error registrando tarea:", err);
      await alert({
        title: "Error",
        message: "Ocurrió un error al registrar el trabajo.",
        variant: "danger",
      });
    } finally {
      setSavingWorkLog(false);
    }
  };

  const handleDeleteWorkLog = async (logId: string) => {
    if (!selectedOrder) return;
    const ok = await confirm({
      title: "¿Eliminar registro?",
      message: "¿Deseas eliminar este registro de trabajo de la bitácora?",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/work-orders/${selectedOrder.id}/work-logs?logId=${logId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const orderRes = await fetch(`/api/work-orders/${selectedOrder.id}`);
        if (orderRes.ok) {
          const updated = await orderRes.json();
          syncSelectedOrder(updated.order);
          setOrders((prev) => prev.map((o) => (o.id === updated.order.id ? updated.order : o)));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        await alert({
          title: "Error",
          message: data.error || "No se pudo eliminar el registro",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error("Error al eliminar nota:", err);
    }
  };



  // Filtrado de órdenes activas (excluye canceladas y archivadas)
  const baseActiveOrders = orders.filter((o) => {
    if (isCancelledOrder(o) || o.estado === "CANCELADO" || o.estado === "ENTREGADO" || o.estado === "ARCHIVADO") {
      return false;
    }
    if (mechanicFilter === "TODOS") return true;
    if (mechanicFilter === "UNASSIGNED") return !o.mechanicId && !o.mechanic;
    return o.mechanicId === mechanicFilter || o.mechanic?.id === mechanicFilter;
  });

  const filteredOrders = baseActiveOrders.filter((o) => {
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
          o.mechanic?.nombre,
          o.mechanic?.apellido,
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
    return true;
  });

  const counts = {
    total: baseActiveOrders.length,
    pendiente: baseActiveOrders.filter((o) => o.estado === "PENDIENTE" || o.estado === "PENDIENTE_PERITAJE" || o.estado === "INGRESADO").length,
    enCurso: baseActiveOrders.filter((o) => o.estado === "EN_CURSO" || o.estado === "EN_REPARACION" || o.estado === "PERITADO").length,
    esperandoRepuestos: baseActiveOrders.filter((o) => o.estado === "ESPERANDO_REPUESTOS" || o.estado === "EN_ESPERA_REPUESTOS" || o.estado === "DETENIDO").length,
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
                    {isEncargado ? "Vista General de Taller (Admin)" : "Módulo de Taller"}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                    Hoja de Trabajo
                  </h1>
                  <p className="text-xs text-sky-300 font-medium mt-0.5">
                    {isEncargado
                      ? `Órdenes de todos los mecánicos • ${counts.total} vehículos en taller`
                      : `Panel Táctil para Mecánicos • ${counts.total} vehículos en taller`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchOrders}
                className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Actualizar listado de vehículos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Chips de Conteo y Filtro por Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
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
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por patente, modelo, cliente o mecánico..."
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
                    : counts.esperandoRepuestos}
                  )
                </button>
              ))}
            </div>

            {/* Filtro de Mecánicos para Admin / Encargado */}
            {isEncargado && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-sky-600" />
                    Filtrar por Mecánico:
                  </span>
                  {mechanicFilter !== "TODOS" && (
                    <button
                      type="button"
                      onClick={() => setMechanicFilter("TODOS")}
                      className="text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                    >
                      Mostrar todos
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setMechanicFilter("TODOS")}
                    className={`px-2.5 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                      mechanicFilter === "TODOS"
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-extrabold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    👥 Todos los mecánicos ({orders.filter((o) => !isCancelledOrder(o) && o.estado !== "CANCELADO" && o.estado !== "ENTREGADO" && o.estado !== "ARCHIVADO").length})
                  </button>
                  {mechanics.map((m) => {
                    const count = orders.filter(
                      (o) =>
                        !isCancelledOrder(o) &&
                        o.estado !== "CANCELADO" &&
                        o.estado !== "ENTREGADO" &&
                        o.estado !== "ARCHIVADO" &&
                        (o.mechanicId === m.id || o.mechanic?.id === m.id)
                    ).length;
                    const isSelected = mechanicFilter === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMechanicFilter(m.id)}
                        className={`px-2.5 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-extrabold"
                            : "bg-indigo-50/60 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/60"
                        }`}
                      >
                        🔧 {m.nombre} {m.apellido || ""} ({count})
                      </button>
                    );
                  })}
                  {(() => {
                    const unassignedCount = orders.filter(
                      (o) =>
                        !isCancelledOrder(o) &&
                        o.estado !== "CANCELADO" &&
                        o.estado !== "ENTREGADO" &&
                        o.estado !== "ARCHIVADO" &&
                        !o.mechanicId &&
                        !o.mechanic
                    ).length;
                    const isSelected = mechanicFilter === "UNASSIGNED";
                    return (
                      <button
                        type="button"
                        onClick={() => setMechanicFilter("UNASSIGNED")}
                        className={`px-2.5 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-extrabold"
                            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/60"
                        }`}
                      >
                        ⚠️ Sin asignar ({unassignedCount})
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
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
                            (p.cerrado === true ||
                              p.estadoPeritaje === "COMPLETADO" ||
                              p.estadoPeritaje === "CERRADO" ||
                              Boolean(p.fechaCierre))
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

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-[11px] text-slate-500 font-medium">
                            Orden #{order.numeroOrden} • {order.vehicle.client.nombre} {order.vehicle.client.apellido || ""}
                          </p>
                          {order.mechanic ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                              <Wrench className="w-2.5 h-2.5 text-indigo-500" />
                              {order.mechanic.nombre} {order.mechanic.apellido || ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                              ⚠️ Sin mecánico
                            </span>
                          )}
                        </div>
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
                        {isPeritaje && <span>Peritar Vehículo</span>}
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
              <span>Volver a la Hoja de Trabajo</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-sky-800 bg-sky-100 px-3 py-1 rounded-xl border border-sky-200 tracking-wider">
                ORDEN #{selectedOrder.numeroOrden}
              </span>
              <button
                type="button"
                onClick={fetchOrders}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Refrescar datos del vehículo"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tarjeta Resumen Fija del Vehículo */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Vehículo en Taller
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Ingresó: {new Date(selectedOrder.fechaIngreso).toLocaleDateString("es-AR")}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-indigo-600" />
                    {selectedOrder.mechanic
                      ? `Mecánico: ${selectedOrder.mechanic.nombre} ${selectedOrder.mechanic.apellido || ""}`
                      : "Sin mecánico asignado"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {selectedOrder.vehicle.marca} {selectedOrder.vehicle.modelo}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Selector rápido de reasignación para Encargado/Admin */}
                {isEncargado && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Mecánico:</span>
                    <select
                      value={selectedOrder.mechanicId || selectedOrder.mechanic?.id || ""}
                      onChange={(e) => handleAssignMechanic(selectedOrder.id, e.target.value)}
                      disabled={updatingMechanic}
                      aria-label="Asignar mecánico a la orden"
                      className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="">⚠️ Sin asignar</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} {m.apellido || ""}
                        </option>
                      ))}
                    </select>
                    {updatingMechanic && (
                      <span className="text-[10px] text-sky-600 font-bold animate-pulse">...</span>
                    )}
                  </div>
                )}

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

            {/* Datos Técnicos y Contacto Directo: Optimizado en 2 columnas en tablet/móvil y 4 columnas en desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-200/80 flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Año / Color</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate block mt-1">
                    {selectedOrder.vehicle.anio} • {selectedOrder.vehicle.color || "s/d"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Fuel className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Combustible</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate block mt-1">
                    {selectedOrder.nivelNafta || "1/2"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                  <Gauge className="w-4 h-4 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Odómetro</span>
                  <span className="font-bold font-mono text-slate-800 text-xs sm:text-sm truncate block mt-1">
                    {selectedOrder.kilometraje ? `${Number(selectedOrder.kilometraje).toLocaleString("es-AR")} km` : "s/d"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Titular</span>
                  <span
                    className="font-bold text-slate-800 text-xs sm:text-sm truncate block mt-1"
                    title={`${selectedOrder.vehicle.client.nombre} ${selectedOrder.vehicle.client.apellido || ""}`}
                  >
                    {selectedOrder.vehicle.client.nombre} {selectedOrder.vehicle.client.apellido || ""}
                  </span>
                </div>
                {selectedOrder.vehicle.client.telefono && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${selectedOrder.vehicle.client.telefono}`}
                      className="p-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-700 transition-colors shadow-2xs"
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
                      className="p-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white transition-colors shadow-2xs"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Motivo de Consulta Reportado */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block text-[11px] mb-0.5">
                Motivo de Ingreso / Tarea a Realizar:
              </span>
              <p className="leading-relaxed text-slate-600 text-xs sm:text-sm">
                {selectedOrder.detallesIngreso || "Mantenimiento general y diagnóstico."}
              </p>
            </div>

            {selectedOrder.comentariosDuenio?.trim() && (
              <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200/90 text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Declaración inicial de daños del dueño (Solo lectura):</span>
                </div>
                <p className="font-semibold text-slate-800 italic pl-5 text-xs sm:text-sm">
                  &ldquo;{selectedOrder.comentariosDuenio.trim()}&rdquo;
                </p>
              </div>
            )}

            {/* Peritaje Registrado: Resumen con botón de Ver Ficha para el Mecánico */}
            {isSelectedOrderPeritajeCerrado && (
              <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-sm text-white">
                        Peritaje de Ingreso Registrado
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Solo Lectura
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-xs text-slate-300 block mt-0.5">
                      {parsedPeritajeInfo?.peritadorNombre ? `Peritado por ${parsedPeritajeInfo.peritadorNombre}` : "Constatación legal completada"} • Solo Consulta
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPeritajeModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Peritaje</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TARJETA DE ACCIÓN GUIADA SEGÚN LA ETAPA (ENCOLUMNADA VERTICALMENTE)       */}
          {/* ========================================================================= */}
          <div className="rounded-3xl p-4 sm:p-5 shadow-sm border space-y-3 transition-all bg-white border-slate-200">
            {/* ETAPA 1: PENDIENTE DE PERITAJE */}
            {isSelectedOrderInPeritaje && (
              <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col gap-4 shadow-xs">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm text-xl">
                    📋
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                        Etapa 1: Inspección de Ingreso
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Paso Requerido
                      </span>
                    </div>
                    <h4 className="font-black text-sm sm:text-base text-slate-900">
                      Peritaje Pendiente
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Registrá los daños de carrocería, testigos del tablero y fotos para habilitar la reparación técnica.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPeritajeModalOpen(true)}
                  className="w-full py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Comenzar Peritaje de Ingreso</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ETAPA 2: EN REPARACIÓN */}
            {isSelectedOrderInReparacion && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col gap-4 shadow-xs">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm text-xl">
                    🔧
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        Etapa 2: Reparación Activa
                      </span>
                      <span className="text-[11px] font-bold text-blue-900 bg-blue-100/70 px-2.5 py-0.5 rounded-md border border-blue-200/60 font-mono">
                        {totalHorasInvertidas} hs acumuladas
                      </span>
                    </div>
                    <h4 className="font-black text-sm sm:text-base text-slate-900">
                      Trabajo Mecánico en Taller
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Cargá tareas y horas en la Bitácora. Podés pausar si faltan piezas o finalizar al concluir la reparación.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => {
                      setOrderToPause(selectedOrder);
                      setPausaRepuestoModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white border-2 border-amber-300 text-amber-900 hover:bg-amber-50 active:scale-[0.99] font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                    title="Pausar trabajo indicando falla y repuestos necesarios"
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col gap-4 shadow-xs">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm text-xl">
                    ⏸️
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Etapa 3: Trabajo Pausado
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md border border-amber-200/60">
                        Aguardando repuestos
                      </span>
                    </div>
                    <h4 className="font-black text-sm sm:text-base text-slate-900">
                      En Espera de Repuestos o Insumos
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Cuando lleguen las piezas necesarias, reanudá el trabajo para continuar con la mecánica.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleUpdateStatus(selectedOrder.id, "EN_CURSO")}
                  className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <PlayCircle className="w-5 h-5 text-white" />
                  <span>Reanudar Reparación en Taller</span>
                </button>
              </div>
            )}

            {/* ETAPA 4: FINALIZADO */}
            {isSelectedOrderTerminado && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mb-1">
                        Etapa 4: Reparación Concluida
                      </span>
                      <h4 className="font-black text-sm sm:text-base text-emerald-950">
                        Vehículo Listo para Entrega al Cliente
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                        El trabajo técnico concluyó exitosamente. Recepción puede realizar la entrega y archivo final.
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs sm:text-sm self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
                    <Lock className="w-4 h-4 text-emerald-600" />
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
          {/* SECCIÓN BITÁCORA Y REGISTRO DE TRABAJOS (WORKLOGS)                         */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Bitácora y Notas Diarias del Proceso de Arreglo
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registro cronológico de arreglos mecánicos y fotos de evidencia técnica.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  {selectedOrder.workLogs?.length || 0} {(selectedOrder.workLogs?.length || 0) === 1 ? "nota" : "notas"}
                </span>
                {!["FINALIZADO", "REPARADO", "TERMINADO", "ENTREGADO", "ARCHIVADO"].includes(selectedOrder.estado) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedOrderHasPeritaje) {
                        await alert({
                          title: "Peritaje Requerido",
                          message: "No se puede empezar a reparar el vehículo sin cerrar el peritaje primero.",
                          variant: "warning",
                          icon: "warning",
                        });
                        setPeritajeModalOpen(true);
                        return;
                      }
                      setNewWorkLogTarea("");
                      setNewWorkLogHoras("1.0");
                      setNewWorkLogFotos([]);
                      setShowAddWorkLog(true);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Cargar Arreglo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Aviso si la orden está finalizada */}
            {isSelectedOrderTerminado && (
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
            )}

            {/* Aviso si el peritaje no está completado */}
            {!selectedOrderHasPeritaje && !isSelectedOrderTerminado && (
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
            )}

            {/* Lista vacía o contenido de bitácora */}
            {(!selectedOrder.workLogs || selectedOrder.workLogs.length === 0) ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Aún no se han asentado notas diarias de trabajo</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Los arreglos técnicos y las fotografías del trabajo se visualizarán aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOrder.workLogs.map((log: any, idx: number) => {
                  let fotosList: any[] = [];
                  try {
                    if (log.fotos) {
                      fotosList = typeof log.fotos === "string" ? JSON.parse(log.fotos) : log.fotos;
                    }
                  } catch {}

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                            #{selectedOrder.workLogs.length - idx}
                          </span>
                          <span className="font-extrabold text-slate-800">
                            🔧 {log.mechanic ? `${log.mechanic.nombre} ${log.mechanic.apellido || ""}` : "Mecánico"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-8 sm:pl-0">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.fechaRegistro).toLocaleString("es-AR")}
                          </span>
                          {!["FINALIZADO", "REPARADO", "TERMINADO", "ENTREGADO", "ARCHIVADO"].includes(selectedOrder.estado) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteWorkLog(log.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar este registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 font-medium pl-8 leading-relaxed whitespace-pre-wrap">
                        {log.descripcionTarea}
                      </p>

                      {/* Fotos y Videos del Arreglo */}
                      {Array.isArray(fotosList) && fotosList.length > 0 && (
                        <div className="pl-8 pt-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1.5">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Evidencias del arreglo ({fotosList.length}):</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {fotosList.map((f: any, fIdx: number) => {
                              const mediaUrl = typeof f === "string" ? f : f?.url;
                              if (!mediaUrl) return null;
                              const isVid = /\.(mp4|webm|mov|m4v|avi|3gp|3gpp|mkv)$/i.test(mediaUrl) || mediaUrl.includes("video");

                              return (
                                <button
                                  key={fIdx}
                                  type="button"
                                  onClick={() => setActiveModalImg(mediaUrl)}
                                  className="relative group rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-500 shadow-2xs hover:shadow-md transition-all active:scale-95 cursor-pointer bg-black"
                                >
                                  {isVid ? (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-slate-900 relative">
                                      <video src={mediaUrl} className="w-full h-full object-cover" preload="metadata" />
                                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">
                                        <Video className="w-5 h-5" />
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={mediaUrl}
                                      alt={`Evidencia ${fIdx + 1}`}
                                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {log.horasInvertidas > 0 && (
                        <div className="pl-8 pt-1 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                            ⏱️ {log.horasInvertidas} hs computadas
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Modal de Pausa por Repuestos (Carga de falla, repuestos y foto) */}
      {pausaRepuestoModalOpen && orderToPause && (
        <PausaRepuestoModal
          isOpen={pausaRepuestoModalOpen}
          order={orderToPause}
          onClose={() => {
            setPausaRepuestoModalOpen(false);
            setOrderToPause(null);
          }}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Modal emergente para registrar nuevo arreglo técnico con fotos y/o videos */}
      {showAddWorkLog && selectedOrder && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 flex flex-col max-h-[92vh]">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      Cargar Arreglo Técnico
                    </h3>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Orden #{selectedOrder.numeroOrden} • {selectedOrder.vehicle?.marca} {selectedOrder.vehicle?.modelo} ({selectedOrder.vehicle?.patente})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={savingWorkLog}
                  onClick={() => setShowAddWorkLog(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario del Modal */}
              <form onSubmit={handleSaveWorkLog} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  {/* Campo 1: Tarea / Arreglo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Descripción del Arreglo / Tarea Realizada <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      autoFocus
                      disabled={savingWorkLog}
                      value={newWorkLogTarea}
                      onChange={(e) => setNewWorkLogTarea(e.target.value)}
                      placeholder="Detallá minuciosamente el trabajo efectuado (ej: Sustitución de pastillas de freno delanteras y purgado)..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 disabled:opacity-60"
                    />
                  </div>

                  {/* Campo 2: Duración (Tiempo dedicado) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        Tiempo Dedicado (Horas)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Cómputo en bitácora técnica de la orden
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        max="24"
                        required
                        disabled={savingWorkLog}
                        value={newWorkLogHoras}
                        onChange={(e) => setNewWorkLogHoras(e.target.value)}
                        className="w-20 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-black text-center text-slate-900 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                      />
                      <span className="text-xs font-bold text-slate-600">hs</span>
                    </div>
                  </div>

                  {/* Campo 3: Fotos y/o Videos de Evidencia */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-800">
                          Fotos y/o Videos de Evidencia (Opcional)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Adjuntá fotos o videos técnicos de la reparación
                        </p>
                      </div>
                      {uploadingWorkLogPhoto && (
                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo archivo...
                        </span>
                      )}
                    </div>

                    {/* Botones de Carga */}
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs ${
                          uploadingWorkLogPhoto || savingWorkLog ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Tomar Foto / Video</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          capture="environment"
                          onChange={handleUploadWorkLogPhoto}
                          disabled={uploadingWorkLogPhoto || savingWorkLog}
                          className="sr-only"
                        />
                      </label>

                      <label
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs ${
                          uploadingWorkLogPhoto || savingWorkLog ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Subir de Galería</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleUploadWorkLogPhoto}
                          disabled={uploadingWorkLogPhoto || savingWorkLog}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {/* Previsualización de archivos adjuntos */}
                    {newWorkLogFotos.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                        <span className="text-[11px] font-extrabold text-slate-700 block">
                          Archivos adjuntos ({newWorkLogFotos.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {newWorkLogFotos.map((url, fIdx) => {
                            const isVid = /\.(mp4|webm|mov|m4v|avi|3gp|3gpp|mkv)$/i.test(url) || url.includes("video");
                            return (
                              <div
                                key={fIdx}
                                className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-black shrink-0"
                              >
                                {isVid ? (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-900 relative">
                                    <video src={url} className="w-full h-full object-cover" preload="metadata" />
                                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">
                                      <Video className="w-5 h-5" />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`Evidencia ${fIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                )}
                                <button
                                  type="button"
                                  disabled={savingWorkLog}
                                  onClick={() =>
                                    setNewWorkLogFotos((prev) => prev.filter((_, idx) => idx !== fIdx))
                                  }
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                                  title="Eliminar archivo"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveModalImg(url)}
                                  className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center shadow-md hover:bg-black transition-colors cursor-pointer"
                                  title="Ampliar vista"
                                >
                                  <Maximize2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer del Modal con estado de carga */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={savingWorkLog}
                    onClick={() => setShowAddWorkLog(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingWorkLog || uploadingWorkLogPhoto || !newWorkLogTarea.trim()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingWorkLog ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Guardar en Bitácora</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Lightbox de Foto o Video */}
      {activeModalImg && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-screen h-screen z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setActiveModalImg(null)}
          >
            <div
              className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/\.(mp4|webm|mov|m4v|avi|3gp|3gpp|mkv)$/i.test(activeModalImg) || activeModalImg.includes("video") ? (
                <video
                  src={activeModalImg}
                  controls
                  autoPlay
                  playsInline
                  className="rounded-2xl max-w-full max-h-[80vh] shadow-2xl bg-black"
                />
              ) : (
                <img
                  src={activeModalImg}
                  alt="Evidencia Full"
                  className="rounded-2xl max-w-full max-h-[80vh] object-contain shadow-2xl"
                />
              )}
              <button
                type="button"
                onClick={() => setActiveModalImg(null)}
                className="mt-2 px-6 py-2 rounded-full bg-white text-slate-900 font-bold text-xs shadow-xl hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cerrar Vista</span>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
