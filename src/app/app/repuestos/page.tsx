"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  Camera,
  Truck,
  FileText,
  ArrowRight,
  ExternalLink,
  User,
  Car,
  Wrench,
  RefreshCw,
  X,
  Loader2,
  Calendar,
  Building2,
  History,
  RotateCcw,
  Ban,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Send,
} from "lucide-react";
import { SparePartRequest, SparePartItem, SparePartPhoto } from "@/types";
import { useAppDialog } from "@/components/AppDialog";
import { normalizeRole } from "@/lib/auth";
import {
  SPARE_PARTS_CONFIG,
  SPARE_PART_STATUS_MAP,
  normalizeSparePartStatus,
  isSparePartEscalated,
  isLlegadaVencida,
  formatTiempoTranscurrido,
} from "@/lib/spare-parts-config";
import PausaRepuestoModal from "@/components/PausaRepuestoModal";

export default function RepuestosPage() {
  const { alert, confirm } = useAppDialog();
  const searchParams = useSearchParams();
  const initialPedidoId = searchParams.get("pedidoId");
  const initialEstado = searchParams.get("estado");

  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialEstado || "TODOS");
  const [mechanicFilter, setMechanicFilter] = useState<string>("TODOS");

  // Modal de Detalle / Gestión del Pedido
  const [selectedRequest, setSelectedRequest] = useState<SparePartRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Estados para Acciones del Administrador en el modal
  const [editItemsMode, setEditItemsMode] = useState(false);
  const [itemsAEncargarEditable, setItemsAEncargarEditable] = useState<SparePartItem[]>([]);
  const [notasAdminInput, setNotasAdminInput] = useState("");
  const [devolverModalOpen, setDevolverModalOpen] = useState(false);
  const [motivoDevolucionInput, setMotivoDevolucionInput] = useState("");

  // Estados para Acciones de Recepción
  const [encargoModalOpen, setEncargoModalOpen] = useState(false);
  const [proveedorInput, setProveedorInput] = useState("");
  const [fechaEstimadaInput, setFechaEstimadaInput] = useState("");

  const [recibidoModalOpen, setRecibidoModalOpen] = useState(false);
  const [remitoNroInput, setRemitoNroInput] = useState("");
  const [notasRecepcionInput, setNotasRecepcionInput] = useState("");

  // Estados para Cancelación
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false);
  const [motivoCancelacionInput, setMotivoCancelacionInput] = useState("");

  // Modal para que el mecánico reenvíe un pedido devuelto
  const [reenviarModalOpen, setReenviarModalOpen] = useState(false);
  const [reqToResend, setReqToResend] = useState<SparePartRequest | null>(null);

  // Modal de foto grande (lightbox)
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Obtener usuario actual
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          const r = normalizeRole(data.user.role);

          // Filtro por defecto según el rol (Sección 8):
          // Administrador: ve lo que está por revisar
          // Recepción: ve lo que falta encargar o recibir
          // Mecánico: ve sus propios pedidos
          if (!initialEstado) {
            if (r === "ADMIN") {
              setStatusFilter("POR_REVISAR");
            } else if (r === "RECEPTION") {
              setStatusFilter("PENDIENTES_RECEPCION");
            } else if (r === "MECHANIC") {
              setStatusFilter("TODOS");
            }
          }
        }
      })
      .catch((err) => console.error("Error al obtener usuario:", err));
  }, [initialEstado]);

  // Cargar pedidos desde la API
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/spare-parts", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al consultar pedidos de repuestos");
      const data = await res.json();
      setRequests(data);

      // Si venía un pedidoId en URL, abrir su detalle automáticamente
      if (initialPedidoId) {
        const found = data.find((r: SparePartRequest) => r.id === initialPedidoId);
        if (found) {
          openDetail(found);
        }
      }
    } catch (err: any) {
      console.error("Error al cargar pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, [initialPedidoId]);

  useEffect(() => {
    fetchRequests();
    // Refresco cada 60s
    const interval = setInterval(fetchRequests, SPARE_PARTS_CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const userRole = currentUser ? normalizeRole(currentUser.role) : "RECEPTION";

  // Abrir detalle del pedido
  const openDetail = async (req: SparePartRequest) => {
    try {
      // Consultamos el detalle individual para asegurar auditoría y datos actualizados
      const res = await fetch(`/api/spare-parts/${req.id}`);
      if (res.ok) {
        const fresh = await res.json();
        setSelectedRequest(fresh);
        initAdminEditableItems(fresh);
      } else {
        setSelectedRequest(req);
        initAdminEditableItems(req);
      }
    } catch {
      setSelectedRequest(req);
      initAdminEditableItems(req);
    }
    setDetailModalOpen(true);
  };

  const initAdminEditableItems = (req: SparePartRequest) => {
    // Al abrir la revisión se precarga con los solicitados para que el Administrador los edite
    try {
      if (req.itemsAEncargar) {
        const parsed =
          typeof req.itemsAEncargar === "string"
            ? JSON.parse(req.itemsAEncargar)
            : req.itemsAEncargar;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItemsAEncargarEditable(parsed);
          setNotasAdminInput(req.notasAdmin || "");
          return;
        }
      }
      if (req.itemsSolicitados) {
        const parsed =
          typeof req.itemsSolicitados === "string"
            ? JSON.parse(req.itemsSolicitados)
            : req.itemsSolicitados;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItemsAEncargarEditable(
            parsed.map((it: any) => ({
              id: it.id || `item-${Math.random()}`,
              descripcion: it.descripcion || it.nombre || "",
              cantidad: it.cantidad || 1,
            }))
          );
          setNotasAdminInput(req.notasAdmin || "");
          return;
        }
      }
    } catch {}

    // Fallback con texto libre
    if (req.repuestosLista) {
      const itemsFromText = req.repuestosLista
        .split("\n")
        .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean)
        .map((l, idx) => ({
          id: `item-${idx}`,
          descripcion: l,
          cantidad: 1,
        }));
      setItemsAEncargarEditable(
        itemsFromText.length > 0
          ? itemsFromText
          : [{ id: "item-0", descripcion: "", cantidad: 1 }]
      );
    } else {
      setItemsAEncargarEditable([{ id: "item-0", descripcion: "", cantidad: 1 }]);
    }
    setNotasAdminInput(req.notasAdmin || "");
  };

  // =========================================================================
  // ACCIONES ADMINISTRADOR
  // =========================================================================
  const handleAdminAprobar = async () => {
    if (!selectedRequest) return;

    const validItems = itemsAEncargarEditable.filter(
      (it) => it.descripcion && it.descripcion.trim().length > 0
    );
    if (validItems.length === 0) {
      await alert({
        title: "Lista requerida",
        message: "Debe confirmar al menos un repuesto a encargar con su cantidad.",
        variant: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRMAR_ENCARGO",
          itemsAEncargar: validItems,
          notasAdmin: notasAdminInput.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al confirmar encargo");
      }

      await alert({
        title: "Pedido Aprobado",
        message:
          "La lista definitiva de repuestos fue confirmada. El pedido pasó a Recepción ('Para encargar').",
        variant: "success",
      });

      setDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo aprobar el pedido.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminDevolver = async () => {
    if (!selectedRequest) return;
    if (!motivoDevolucionInput.trim()) {
      await alert({
        title: "Motivo obligatorio",
        message: "Debe ingresar el motivo de la devolución para que el mecánico pueda corregirlo.",
        variant: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DEVOLVER",
          motivoDevolucion: motivoDevolucionInput.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al devolver pedido");
      }

      await alert({
        title: "Pedido Devuelto",
        message: "El pedido fue devuelto al mecánico con el motivo registrado.",
        variant: "info",
      });

      setDevolverModalOpen(false);
      setMotivoDevolucionInput("");
      setDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo devolver el pedido.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // ACCIONES RECEPCIÓN
  // =========================================================================
  const handleRecepcionEncargoRealizado = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENCARGO_REALIZADO",
          proveedor: proveedorInput.trim() || undefined,
          fechaEstimadaLlegada: fechaEstimadaInput || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al registrar encargo");
      }

      await alert({
        title: "Encargo Registrado",
        message: "El encargo ha sido marcado como realizado. El recordatorio continuo ha finalizado.",
        variant: "success",
      });

      setEncargoModalOpen(false);
      setProveedorInput("");
      setFechaEstimadaInput("");
      setDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo registrar el encargo.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecepcionMarcarRecibido = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECIBIDO",
          remitoNro: remitoNroInput.trim() || undefined,
          notasRecepcion: notasRecepcionInput.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al marcar recibido");
      }

      await alert({
        title: "Repuestos Recibidos",
        message:
          "Se confirmó la llegada de los repuestos al taller. Se notificó al mecánico para reanudar la reparación.",
        variant: "success",
      });

      setRecibidoModalOpen(false);
      setRemitoNroInput("");
      setNotasRecepcionInput("");
      setDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo marcar como recibido.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTodaviaNoClick = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const tipo =
        selectedRequest.estado === "ENCARGO_REALIZADO" ? "LLEGADA" : "ENCARGO";
      const res = await fetch(`/api/spare-parts/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TODAVIA_NO",
          tipo,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al posponer recordatorio");
      }

      await alert({
        title: "Recordatorio Pospuesto",
        message: `Se registró 'Todavía no' en auditoría. El recordatorio se pospuso por ${SPARE_PARTS_CONFIG.RECORDATORIO_INTERVALO_MINUTOS} minutos.`,
        variant: "info",
      });

      setDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo posponer.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // ACCIONES CANCELACIÓN (Admin o Mecánico en Solicitado)
  // =========================================================================
  const handleConfirmCancelar = async () => {
    if (!selectedRequest) return;
    if (!motivoCancelacionInput.trim()) {
      await alert({
        title: "Motivo obligatorio",
        message: "Debe ingresar el motivo de la cancelación.",
        variant: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCELAR",
          motivoCancelacion: motivoCancelacionInput.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al cancelar pedido");
      }

      await alert({
        title: "Pedido Cancelado",
        message: "El pedido de repuestos fue cancelado con éxito.",
        variant: "info",
      });

      setCancelarModalOpen(false);
      setMotivoCancelacionInput("");
      setDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo cancelar el pedido.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Mecánicos disponibles para filtro
  const mechanicsList = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.mechanic?.id && r.mechanic?.nombre) {
        map.set(r.mechanic.id, `${r.mechanic.nombre} ${r.mechanic.apellido || ""}`.trim());
      }
    });
    return Array.from(map.entries());
  }, [requests]);

  // Métricas para tarjetas de cabecera
  const metrics = useMemo(() => {
    let solicitados = 0;
    let paraEncargar = 0;
    let escalados = 0;
    let encargados = 0;
    let recibidos = 0;

    requests.forEach((r) => {
      const st = normalizeSparePartStatus(r.estado);
      if (st === "SOLICITADO" || st === "EN_REVISION") solicitados++;
      if (st === "PARA_ENCARGAR") {
        paraEncargar++;
        if (isSparePartEscalated(r)) escalados++;
      }
      if (st === "ENCARGO_REALIZADO") encargados++;
      if (st === "RECIBIDO") recibidos++;
    });

    return {
      total: requests.length,
      solicitados,
      paraEncargar,
      escalados,
      encargados,
      recibidos,
    };
  }, [requests]);

  // Filtrado y ordenamiento con ESCALADOS PRIMERO (rojos arriba)
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const st = normalizeSparePartStatus(r.estado);

      // Filtro por Estado
      if (statusFilter === "POR_REVISAR") {
        const isEscalated = isSparePartEscalated(r);
        if (st !== "SOLICITADO" && st !== "EN_REVISION" && !isEscalated) return false;
      } else if (statusFilter === "PENDIENTES_RECEPCION") {
        if (st !== "PARA_ENCARGAR" && st !== "ENCARGO_REALIZADO") return false;
      } else if (statusFilter === "ESCALADOS") {
        if (!isSparePartEscalated(r)) return false;
      } else if (statusFilter !== "TODOS" && st !== statusFilter) {
        return false;
      }

      // Filtro por Mecánico
      if (mechanicFilter !== "TODOS") {
        if (r.mechanicId !== mechanicFilter && r.workOrder?.mechanicId !== mechanicFilter) {
          return false;
        }
      }

      // Filtro por búsqueda (patente, orden, falla o cliente)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patente = r.workOrder?.vehicle?.patente?.toLowerCase() || "";
        const nroOrden = String(r.workOrder?.numeroOrden || "");
        const falla = r.fallaReparar?.toLowerCase() || "";
        const cliente = `${r.workOrder?.vehicle?.client?.nombre || ""} ${r.workOrder?.vehicle?.client?.apellido || ""}`.toLowerCase();
        const modelo = `${r.workOrder?.vehicle?.marca || ""} ${r.workOrder?.vehicle?.modelo || ""}`.toLowerCase();

        return (
          patente.includes(q) ||
          nroOrden.includes(q) ||
          falla.includes(q) ||
          cliente.includes(q) ||
          modelo.includes(q)
        );
      }

      return true;
    });
  }, [requests, statusFilter, mechanicFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pedido y Seguimiento de Repuestos
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Gestión integral de pausas mecánicas, revisión de ítems, encargos y recepción
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("TODOS")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "TODOS"
              ? "bg-slate-900 text-white border-slate-900 shadow-md"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
            Total Pedidos
          </span>
          <span className="text-xl font-black mt-1 block">{metrics.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("POR_REVISAR")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "POR_REVISAR"
              ? "bg-purple-900 text-white border-purple-900 shadow-md"
              : "bg-white border-purple-200 text-purple-950 hover:bg-purple-50/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
            Por Revisar (Admin)
          </span>
          <span className="text-xl font-black mt-1 block text-purple-600 dark:text-purple-300">
            {metrics.solicitados}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("PARA_ENCARGAR")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "PARA_ENCARGAR"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-white border-amber-200 text-amber-950 hover:bg-amber-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
              Para Encargar
            </span>
            {metrics.escalados > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-sm animate-pulse">
                {metrics.escalados} en rojo
              </span>
            )}
          </div>
          <span className="text-xl font-black mt-1 block text-amber-600">
            {metrics.paraEncargar}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("ENCARGO_REALIZADO")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "ENCARGO_REALIZADO"
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white border-blue-200 text-blue-950 hover:bg-blue-50/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
            Encargados / En Tránsito
          </span>
          <span className="text-xl font-black mt-1 block text-blue-600">{metrics.encargados}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("RECIBIDO")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "RECIBIDO"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
              : "bg-white border-emerald-200 text-emerald-950 hover:bg-emerald-50/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
            Recibidos en Taller
          </span>
          <span className="text-xl font-black mt-1 block text-emerald-600">{metrics.recibidos}</span>
        </button>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por patente, orden, modelo o falla diagnosticada..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por estado */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="POR_REVISAR">Por revisar (Admin)</option>
              <option value="PENDIENTES_RECEPCION">Pendientes (Recepción)</option>
              <option value="ESCALADOS">🚨 Escalados en Rojo ({">"} 4h)</option>
              <option value="SOLICITADO">1. Solicitado</option>
              <option value="EN_REVISION">2. En revisión</option>
              <option value="PARA_ENCARGAR">3. Para encargar</option>
              <option value="DEVUELTO">4. Devuelto</option>
              <option value="ENCARGO_REALIZADO">5. Encargo realizado</option>
              <option value="RECIBIDO">6. Recibido</option>
              <option value="CANCELADO">7. Cancelado</option>
            </select>
          </div>

          {/* Filtro por mecánico */}
          {userRole !== "MECHANIC" && mechanicsList.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Mecánico:</span>
              <select
                value={mechanicFilter}
                onChange={(e) => setMechanicFilter(e.target.value)}
                className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="TODOS">Todos los mecánicos</option>
                {mechanicsList.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* LISTADO DE PEDIDOS (TABLA / CARDS) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && requests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Cargando pedidos de repuestos...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No se encontraron pedidos de repuestos</p>
            <p className="text-xs text-slate-400">
              Prueba cambiando los filtros seleccionados o la búsqueda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => {
              const st = normalizeSparePartStatus(req.estado);
              const statusInfo = SPARE_PART_STATUS_MAP[st] || SPARE_PART_STATUS_MAP.SOLICITADO;
              const isEscalated = isSparePartEscalated(req);
              const isVencida = isLlegadaVencida(req);

              // Conteo de repuestos
              let itemsCount = 1;
              try {
                if (req.itemsAEncargar) itemsCount = JSON.parse(req.itemsAEncargar as string).length;
                else if (req.itemsSolicitados) itemsCount = JSON.parse(req.itemsSolicitados as string).length;
              } catch {}

              return (
                <div
                  key={req.id}
                  onClick={() => openDetail(req)}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all cursor-pointer hover:bg-slate-50/80 ${
                    isEscalated
                      ? "bg-rose-50/70 border-l-4 border-l-rose-600 hover:bg-rose-50"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Vehículo, Orden y Falla */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isEscalated
                          ? "bg-rose-600 text-white shadow-rose-600/30"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Package className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Orden #{req.workOrder?.numeroOrden}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-mono text-[11px] font-black rounded-md">
                          {req.workOrder?.vehicle?.patente || "SIN PATENTE"}
                        </span>
                        <span className="text-xs font-bold text-slate-700 truncate">
                          {req.workOrder?.vehicle?.marca} {req.workOrder?.vehicle?.modelo}
                        </span>

                        {isEscalated && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Escalado ({">"} {SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)
                          </span>
                        )}
                        {isVencida && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-md uppercase tracking-wider border border-rose-200">
                            Llegada Vencida
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-semibold line-clamp-1">
                        <span className="text-slate-500 font-normal">Falla:</span> {req.fallaReparar}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          Mecánico:{" "}
                          <strong className="text-slate-700">
                            {req.mechanic?.nombre} {req.mechanic?.apellido || ""}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Cliente: {req.workOrder?.vehicle?.client?.nombre}{" "}
                          {req.workOrder?.vehicle?.client?.apellido || ""}
                        </span>
                        <span>•</span>
                        <span>{itemsCount} repuesto(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado, Tiempos y Acceso */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${statusInfo.badgeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                        <span>{statusInfo.label}</span>
                      </span>

                      <div className="text-[11px] text-slate-500 font-medium flex items-center lg:justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Hace {formatTiempoTranscurrido(req.createdAt)}</span>
                        {req.fechaEstimadaLlegada && (
                          <span className="ml-1 text-slate-700 font-bold">
                            • Llega: {new Date(req.fechaEstimadaLlegada).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(req);
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DETALLE COMPLETO DEL PEDIDO                                         */}
      {/* ========================================================================= */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 font-mono text-xs font-black uppercase tracking-wider">
                    Pedido #{selectedRequest.id.slice(-4)}
                  </span>
                  <span className="text-slate-300 text-xs font-medium">
                    Orden #{selectedRequest.workOrder?.numeroOrden}
                  </span>
                  {isSparePartEscalated(selectedRequest) && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider animate-pulse">
                      🚨 Escalado ({">"} {SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>
                    {selectedRequest.workOrder?.vehicle?.marca}{" "}
                    {selectedRequest.workOrder?.vehicle?.modelo}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-mono text-xs rounded border border-white/20">
                    {selectedRequest.workOrder?.vehicle?.patente}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Cliente: {selectedRequest.workOrder?.vehicle?.client?.nombre}{" "}
                  {selectedRequest.workOrder?.vehicle?.client?.apellido || ""} • Tel:{" "}
                  {selectedRequest.workOrder?.vehicle?.client?.telefono || "S/D"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido / Pestañas y Datos */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Barra de Estado Actual y Tiempos */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Estado Actual del Pedido:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      SPARE_PART_STATUS_MAP[normalizeSparePartStatus(selectedRequest.estado)]?.badgeClass
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        SPARE_PART_STATUS_MAP[normalizeSparePartStatus(selectedRequest.estado)]?.dotClass
                      }`}
                    />
                    <span>{SPARE_PART_STATUS_MAP[normalizeSparePartStatus(selectedRequest.estado)]?.label}</span>
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-0.5 sm:text-right font-medium">
                  <div>
                    Creado: {new Date(selectedRequest.createdAt).toLocaleString()} por{" "}
                    <strong>
                      {selectedRequest.mechanic?.nombre} {selectedRequest.mechanic?.apellido || ""}
                    </strong>
                  </div>
                  {selectedRequest.fechaRevision && (
                    <div className="text-purple-800">
                      Revisado por Admin: {new Date(selectedRequest.fechaRevision).toLocaleDateString()}
                    </div>
                  )}
                  {selectedRequest.encargadoPor && (
                    <div className="text-blue-800">
                      Encargo: {selectedRequest.encargadoPor} (
                      {selectedRequest.fechaEncargo
                        ? new Date(selectedRequest.fechaEncargo).toLocaleDateString()
                        : "S/D"}
                      )
                    </div>
                  )}
                  {selectedRequest.recibidoPor && (
                    <div className="text-emerald-800 font-bold">
                      Recibido por: {selectedRequest.recibidoPor} (
                      {selectedRequest.fechaRecepcion
                        ? new Date(selectedRequest.fechaRecepcion).toLocaleDateString()
                        : "S/D"}
                      )
                    </div>
                  )}
                </div>
              </div>

              {/* Si está devuelto, mostrar el motivo */}
              {selectedRequest.motivoDevolucion && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Motivo de Devolución al Mecánico:</span>
                  </div>
                  <p className="text-xs font-medium pl-6">{selectedRequest.motivoDevolucion}</p>
                </div>
              )}

              {/* Si está cancelado, mostrar motivo */}
              {selectedRequest.motivoCancelacion && (
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-900 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-700">
                    <Ban className="w-4 h-4 text-slate-600" />
                    <span>Cancelado por: {selectedRequest.canceladoPor || "Usuario"}</span>
                  </div>
                  <p className="text-xs font-medium pl-6">
                    Motivo: "{selectedRequest.motivoCancelacion}"
                  </p>
                </div>
              )}

              {/* 1. ¿Qué se va a reparar con los repuestos? */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  1. Falla a reparar que motiva los repuestos:
                </span>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  {selectedRequest.fallaReparar}
                </p>
              </div>

              {/* 2. Observaciones del mecánico */}
              {selectedRequest.observacionesMecanico && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    Observaciones del Mecánico:
                  </span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedRequest.observacionesMecanico}
                  </p>
                </div>
              )}

              {/* 3. Ítems Solicitados vs Ítems a Encargar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Columna Izquierda: Solicitados por el Mecánico */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ítems Solicitados</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Original Mecánico</span>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      let list: any[] = [];
                      try {
                        if (selectedRequest.itemsSolicitados) {
                          list =
                            typeof selectedRequest.itemsSolicitados === "string"
                              ? JSON.parse(selectedRequest.itemsSolicitados)
                              : selectedRequest.itemsSolicitados;
                        }
                      } catch {}

                      if (list.length > 0) {
                        return list.map((it, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800">
                              {it.descripcion || it.nombre}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-black text-slate-900">
                              {it.cantidad}x
                            </span>
                          </div>
                        ));
                      }

                      return (
                        <p className="text-xs text-slate-700 font-mono whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
                          {selectedRequest.repuestosLista}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Columna Derecha: Ítems a Encargar (Administrador) */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ítems a Encargar</span>
                    </span>
                    <span className="text-[10px] font-black text-amber-700 uppercase">
                      Definido por Admin
                    </span>
                  </div>

                  {/* Modo Edición para Administrador (cuando está en revisión) */}
                  {userRole === "ADMIN" &&
                  (selectedRequest.estado === "SOLICITADO" ||
                    selectedRequest.estado === "EN_REVISION") ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-amber-800">
                        Edita la lista definitiva de repuestos que Recepción debe encargar:
                      </p>

                      <div className="space-y-2">
                        {itemsAEncargarEditable.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-2 bg-white rounded-xl border border-amber-200 flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItemsAEncargarEditable((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, descripcion: val } : it
                                  )
                                );
                              }}
                              placeholder="Descripción del repuesto"
                              className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-300 font-medium"
                            />
                            <input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1);
                                setItemsAEncargarEditable((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, cantidad: val } : it
                                  )
                                );
                              }}
                              className="w-14 text-xs px-2 py-1 rounded-lg border border-slate-300 font-bold text-center"
                            />
                            {itemsAEncargarEditable.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setItemsAEncargarEditable((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setItemsAEncargarEditable((prev) => [
                            ...prev,
                            { id: `item-new-${Date.now()}`, descripcion: "", cantidad: 1 },
                          ])
                        }
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Agregar otro repuesto</span>
                      </button>

                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Notas para Recepción:
                        </label>
                        <input
                          type="text"
                          value={notasAdminInput}
                          onChange={(e) => setNotasAdminInput(e.target.value)}
                          placeholder="Ej: Pedir en Distribuidora Norte con descuento de taller..."
                          className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-amber-200"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Vista de solo lectura para los demás roles o estados */
                    <div className="space-y-2">
                      {(() => {
                        let list: any[] = [];
                        try {
                          if (selectedRequest.itemsAEncargar) {
                            list =
                              typeof selectedRequest.itemsAEncargar === "string"
                                ? JSON.parse(selectedRequest.itemsAEncargar)
                                : selectedRequest.itemsAEncargar;
                          }
                        } catch {}

                        if (list.length > 0) {
                          return list.map((it, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-900">
                                {it.descripcion || it.nombre}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 font-mono font-black text-amber-950">
                                {it.cantidad}x
                              </span>
                            </div>
                          ));
                        }

                        return (
                          <p className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-slate-200">
                            Pendiente de definición por el Administrador.
                          </p>
                        );
                      })()}

                      {selectedRequest.notasAdmin && (
                        <div className="p-2.5 bg-amber-100/60 rounded-xl text-xs text-amber-950">
                          <strong>Nota del Admin:</strong> {selectedRequest.notasAdmin}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Galería de Fotos con Notas Ancladas */}
              {(() => {
                let photoList: any[] = [];
                try {
                  if (selectedRequest.fotos) {
                    photoList =
                      typeof selectedRequest.fotos === "string"
                        ? JSON.parse(selectedRequest.fotos)
                        : selectedRequest.fotos;
                  } else if (selectedRequest.fotoUrl) {
                    photoList = [
                      { id: "foto-0", url: selectedRequest.fotoUrl, nota: "Foto inicial de evidencia" },
                    ];
                  }
                } catch {}

                if (photoList.length === 0) return null;

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fotografías con Nota Anclada ({photoList.length})</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {photoList.map((foto: any, idx: number) => (
                        <div
                          key={foto.id || idx}
                          onClick={() => setActivePhotoUrl(foto.url)}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <img
                            src={foto.url}
                            alt={`Foto repuesto ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-2xs shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              Foto #{idx + 1}
                            </span>
                            <p className="text-xs text-slate-800 font-medium truncate">
                              {foto.nota || "Sin nota anclada"}
                            </p>
                            <span className="text-[10px] text-amber-600 font-bold hover:underline">
                              Ver en grande
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 5. Datos de Encargo y Proveedor (Si ya se encargó) */}
              {selectedRequest.encargadoPor && (
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-900">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Datos del Encargo Realizado:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-950">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-500 block">
                        Proveedor:
                      </span>
                      <strong className="text-sm">
                        {selectedRequest.proveedor || "No indicado"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-500 block">
                        Fecha Estimada Llegada:
                      </span>
                      <strong className="text-sm">
                        {selectedRequest.fechaEstimadaLlegada
                          ? new Date(selectedRequest.fechaEstimadaLlegada).toLocaleDateString()
                          : "No fijada"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-500 block">
                        Encargado por:
                      </span>
                      <strong>{selectedRequest.encargadoPor}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Datos de Recepción en Taller (Si ya se recibió) */}
              {selectedRequest.fechaRecepcion && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Recepción de Piezas Concluida:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-950">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                        Recibido Por:
                      </span>
                      <strong className="text-sm">{selectedRequest.recibidoPor}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                        Nº Remito:
                      </span>
                      <strong className="text-sm">
                        {selectedRequest.remitoNro || "Sin remito"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                        Notas Recepción:
                      </span>
                      <span>{selectedRequest.notasRecepcion || "Conforme"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Registro de Auditoría (Exclusivo Administrador - Sección 9) */}
              {userRole === "ADMIN" && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Log de Auditoría Inalterable del Pedido (Admin)</span>
                    </span>
                    <Link
                      href={`/app/admin/auditoria?search=${selectedRequest.id}`}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
                    >
                      <span>Ver historial completo</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] space-y-1">
                    <div>• ID Pedido: {selectedRequest.id}</div>
                    <div>• Creado: {selectedRequest.createdAt}</div>
                    <div>• Estado actual: {selectedRequest.estado}</div>
                    {selectedRequest.posposiciones && (
                      <div>
                        • Posposiciones ('Todavía no'):{" "}
                        {typeof selectedRequest.posposiciones === "string"
                          ? selectedRequest.posposiciones
                          : JSON.stringify(selectedRequest.posposiciones)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BOTONERA DE ACCIONES SEGÚN ROL Y ESTADO (SECCIÓN 9) */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/app/ordenes/${selectedRequest.workOrderId}`}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ver Orden Completa</span>
                </Link>

                {/* Cancelar pedido: Admin (en cualquier estado < RECIBIDO), Mecánico (solo en SOLICITADO) */}
                {selectedRequest.estado !== "RECIBIDO" &&
                  selectedRequest.estado !== "CANCELADO" &&
                  (userRole === "ADMIN" ||
                    (userRole === "MECHANIC" && selectedRequest.estado === "SOLICITADO")) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMotivoCancelacionInput("");
                        setCancelarModalOpen(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancelar Pedido</span>
                    </button>
                  )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                
                {/* ACCIONES DEL ADMINISTRADOR */}
                {userRole === "ADMIN" &&
                  (selectedRequest.estado === "SOLICITADO" ||
                    selectedRequest.estado === "EN_REVISION") && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMotivoDevolucionInput("");
                          setDevolverModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Devolver al Mecánico</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleAdminAprobar}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Aprobar y Pasar a Recepción</span>
                      </button>
                    </>
                  )}

                {/* ACCIONES DE RECEPCIÓN */}
                {(userRole === "RECEPTION" || userRole === "ADMIN") &&
                  selectedRequest.estado === "PARA_ENCARGAR" && (
                    <>
                      <button
                        type="button"
                        onClick={handleTodaviaNoClick}
                        className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Todavía no (Posponer 30m)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProveedorInput("");
                          setFechaEstimadaInput("");
                          setEncargoModalOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Encargo Realizado</span>
                      </button>
                    </>
                  )}

                {/* Confirmar Llegada / Recibido */}
                {(userRole === "RECEPTION" || userRole === "ADMIN") &&
                  selectedRequest.estado === "ENCARGO_REALIZADO" && (
                    <>
                      {isLlegadaVencida(selectedRequest) && (
                        <button
                          type="button"
                          onClick={handleTodaviaNoClick}
                          className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          Todavía no llegó (Posponer)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRemitoNroInput("");
                          setNotasRecepcionInput("");
                          setRecibidoModalOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmar Recepción de Repuestos</span>
                      </button>
                    </>
                  )}

                {/* ACCIONES DEL MECÁNICO (Reenviar si fue Devuelto) */}
                {userRole === "MECHANIC" && selectedRequest.estado === "DEVUELTO" && (
                  <button
                    type="button"
                    onClick={() => {
                      setReqToResend(selectedRequest);
                      setReenviarModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Corregir y Reenviar Pedido</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DEVOLVER AL MECÁNICO CON MOTIVO OBLIGATORIO                         */}
      {/* ========================================================================= */}
      {devolverModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700 font-extrabold text-base">
              <RotateCcw className="w-5 h-5" />
              <span>Devolver Pedido al Mecánico</span>
            </div>
            <p className="text-xs text-slate-600">
              Indica qué debe corregir o aclarar el mecánico para que pueda ajustar su pedido:
            </p>
            <textarea
              required
              rows={3}
              value={motivoDevolucionInput}
              onChange={(e) => setMotivoDevolucionInput(e.target.value)}
              placeholder="Ej: Aclarar si el disco es ventilado o sólido y verificar número de chasis..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDevolverModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAdminDevolver}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md"
              >
                Confirmar Devolución
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ENCARGO REALIZADO (RECEPCIÓN)                                       */}
      {/* ========================================================================= */}
      {encargoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-800 font-extrabold text-base">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span>Confirmar Encargo de Repuestos</span>
            </div>
            <p className="text-xs text-slate-600">
              Registra los datos del pedido realizado con el proveedor (ambos opcionales):
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Proveedor / Distribuidor
                </label>
                <input
                  type="text"
                  value={proveedorInput}
                  onChange={(e) => setProveedorInput(e.target.value)}
                  placeholder="Ej: Distribuidora Central, Repuestos Valencia..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Fecha Estimada de Llegada al Taller
                </label>
                <input
                  type="date"
                  value={fechaEstimadaInput}
                  onChange={(e) => setFechaEstimadaInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEncargoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRecepcionEncargoRealizado}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
              >
                Confirmar Encargo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL RECEPCIÓN DE REPUESTOS                                              */}
      {/* ========================================================================= */}
      {recibidoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-800 font-extrabold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Confirmar Llegada de Repuestos al Taller</span>
            </div>
            <p className="text-xs text-slate-600">
              Registra los datos de recepción del paquete o comprobante:
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nº Remito / Factura Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  value={remitoNroInput}
                  onChange={(e) => setRemitoNroInput(e.target.value)}
                  placeholder="Ej: REM-09941"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Notas de Recepción / Conformidad (Opcional)
                </label>
                <input
                  type="text"
                  value={notasRecepcionInput}
                  onChange={(e) => setNotasRecepcionInput(e.target.value)}
                  placeholder="Paquete en buen estado, piezas verificadas..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecibidoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRecepcionMarcarRecibido}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
              >
                Confirmar Llegada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CANCELAR PEDIDO CON MOTIVO                                          */}
      {/* ========================================================================= */}
      {cancelarModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-800 font-extrabold text-base">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Cancelar Pedido de Repuestos</span>
            </div>
            <p className="text-xs text-slate-600">
              Ingresa el motivo obligatorio por el cual se cancela este pedido:
            </p>
            <textarea
              required
              rows={3}
              value={motivoCancelacionInput}
              onChange={(e) => setMotivoCancelacionInput(e.target.value)}
              placeholder="Ej: Repuesto conseguido por el cliente / Desarme no requirió reemplazo..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelarModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmCancelar}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL REENVIAR PEDIDO CORREGIDO POR EL MECÁNICO                           */}
      {/* ========================================================================= */}
      {reenviarModalOpen && reqToResend && (
        <PausaRepuestoModal
          isOpen={reenviarModalOpen}
          order={reqToResend.workOrder}
          existingRequest={reqToResend}
          onClose={() => {
            setReenviarModalOpen(false);
            setReqToResend(null);
          }}
          onSuccess={() => {
            setDetailModalOpen(false);
            fetchRequests();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* LIGHTBOX FOTO EN GRANDE                                                   */}
      {/* ========================================================================= */}
      {activePhotoUrl && (
        <div
          onClick={() => setActivePhotoUrl(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activePhotoUrl}
              alt="Foto ampliada repuesto"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
