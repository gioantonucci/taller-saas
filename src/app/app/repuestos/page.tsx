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
  Plus,
  Trash2,
  Camera,
  Truck,
  ExternalLink,
  User,
  Wrench,
  RefreshCw,
  X,
  Loader2,
  ChevronRight,
  Ban,
} from "lucide-react";
import { SparePartRequest, SparePartItem } from "@/types";
import { useAppDialog } from "@/components/AppDialog";
import { normalizeRole } from "@/lib/roles";
import {
  SPARE_PARTS_CONFIG,
  SPARE_PART_STATUS_MAP,
  normalizeSparePartStatus,
  isSparePartEscalated,
  isLlegadaVencida,
  formatTiempoTranscurrido,
  getFechaUltimoEstado,
  parseSparePartItems,
  parseSparePartPhotos,
} from "@/lib/spare-parts-config";

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
  const [itemsAEncargarEditable, setItemsAEncargarEditable] = useState<SparePartItem[]>([]);
  const [notasAdminInput, setNotasAdminInput] = useState("");

  // Estados para Acciones de Recepción
  const [encargoModalOpen, setEncargoModalOpen] = useState(false);
  const [proveedorInput, setProveedorInput] = useState("");
  const [fechaEstimadaInput, setFechaEstimadaInput] = useState("");

  const [recibidoModalOpen, setRecibidoModalOpen] = useState(false);
  const [remitoNroInput, setRemitoNroInput] = useState("");
  const [notasRecepcionInput, setNotasRecepcionInput] = useState("");

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
              setStatusFilter("SOLICITADO");
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
  const fetchRequests = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, [initialPedidoId]);

  useEffect(() => {
    fetchRequests();
    // Refresco silencioso cada 60s sin parpadear la pantalla ni recargar spinner
    const interval = setInterval(() => fetchRequests(true), SPARE_PARTS_CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const userRole = currentUser ? normalizeRole(currentUser.role) : "RECEPTION";
  const isMechanic = userRole === "MECHANIC";
  const isReception = userRole === "RECEPTION";
  const isAdmin = userRole === "ADMIN";

  // Abrir detalle del pedido de forma instantánea (0ms de retraso)
  const openDetail = (req: SparePartRequest) => {
    setSelectedRequest(req);
    initAdminEditableItems(req);
    setDetailModalOpen(true);

    // Revalidación en segundo plano sin congelar la interfaz
    fetch(`/api/spare-parts/${req.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh) => {
        if (fresh) {
          setSelectedRequest(fresh);
          initAdminEditableItems(fresh);
        }
      })
      .catch((err) => console.warn("Aviso al refrescar detalle:", err));
  };

  const initAdminEditableItems = (req: SparePartRequest) => {
    // Al abrir la revisión se precarga con los solicitados para que el Administrador los edite
    const existingApproved = parseSparePartItems(req.itemsAEncargar);
    const initialList =
      existingApproved.length > 0
        ? existingApproved
        : parseSparePartItems(req.itemsSolicitados, req.repuestosLista);

    setItemsAEncargarEditable(
      initialList.length > 0
        ? initialList
        : [{ id: "item-0", descripcion: "", cantidad: 1 }]
    );
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
      // Actualización optimista inmediata para respuesta instantánea
      const updatedOptimistic: SparePartRequest = {
        ...selectedRequest,
        estado: "PARA_ENCARGAR",
        itemsAEncargar: validItems,
        notasAdmin: notasAdminInput.trim() || null,
        fechaRevision: new Date().toISOString(),
      };
      setRequests((prev) =>
        prev.map((r) => (r.id === selectedRequest.id ? updatedOptimistic : r))
      );
      setSelectedRequest(updatedOptimistic);

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

      const fresh = await res.json();
      setRequests((prev) =>
        prev.map((r) => (r.id === fresh.id ? fresh : r))
      );

      setDetailModalOpen(false);

      await alert({
        title: "¡Lista Aprobada y Enviada a Recepción!",
        message:
          "Se confirmó la lista editada de repuestos. El pedido pasó a Recepción ('Para encargar').",
        variant: "success",
      });
    } catch (err: any) {
      fetchRequests(true);
      await alert({
        title: "Error",
        message: err.message || "No se pudo aprobar el pedido.",
        variant: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopiarSolicitados = () => {
    if (!selectedRequest) return;
    const parsed = parseSparePartItems(
      selectedRequest.itemsSolicitados,
      selectedRequest.repuestosLista
    );
    if (parsed.length > 0) {
      setItemsAEncargarEditable(
        parsed.map((it, idx) => ({
          id: `item-copy-${Date.now()}-${idx}`,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
        }))
      );
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
      fetchRequests(true);
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
      fetchRequests(true);
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
      if (st === "SOLICITADO") solicitados++;
      if (st === "PARA_ENCARGAR") paraEncargar++;
      if (st === "ENCARGO_REALIZADO") encargados++;
      if (st === "RECIBIDO") recibidos++;
      if (isSparePartEscalated(r)) escalados++;
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

  // Filtrado y ordenamiento de pedidos
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        // Regla: El mecánico solo puede ver los pedidos que él ha realizado
        if (isMechanic && currentUser?.id) {
          if (r.mechanicId !== currentUser.id) return false;
        }

        const st = normalizeSparePartStatus(r.estado);

        // Filtro por Estado y Mecánico (solo aplica a Admin y Recepción)
        if (!isMechanic) {
          if (statusFilter === "SOLICITADO" || statusFilter === "POR_REVISAR") {
            if (st !== "SOLICITADO") return false;
          } else if (statusFilter === "PENDIENTES_RECEPCION") {
            if (st !== "PARA_ENCARGAR" && st !== "ENCARGO_REALIZADO") return false;
          } else if (statusFilter === "ESCALADOS") {
            if (!isSparePartEscalated(r)) return false;
          } else if (statusFilter !== "TODOS" && st !== statusFilter) {
            return false;
          }

          if (mechanicFilter !== "TODOS") {
            if (r.mechanicId !== mechanicFilter && r.workOrder?.mechanicId !== mechanicFilter) {
              return false;
            }
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
      })
      .sort((a, b) => {
        // Para el mecánico: orden cronológico descendente (los más recientes arriba)
        if (isMechanic) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        const aEsc = isSparePartEscalated(a);
        const bEsc = isSparePartEscalated(b);
        if (aEsc && !bEsc) return -1;
        if (!aEsc && bEsc) return 1;

        const dateA = getFechaUltimoEstado(a).getTime();
        const dateB = getFechaUltimoEstado(b).getTime();
        return dateA - dateB;
      });
  }, [requests, statusFilter, mechanicFilter, searchQuery, isMechanic, currentUser]);

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
                {isMechanic ? "Mis Pedidos de Repuestos" : "Pedido y Seguimiento de Repuestos"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isMechanic
                  ? "Historial de repuestos que has solicitado para tus órdenes de trabajo"
                  : "Gestión integral de pausas mecánicas, revisión de ítems, encargos y recepción"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRequests(false)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      {!isMechanic ? (
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
            onClick={() => setStatusFilter("SOLICITADO")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              statusFilter === "SOLICITADO" || statusFilter === "POR_REVISAR"
                ? "bg-purple-900 text-white border-purple-900 shadow-md"
                : "bg-white border-purple-200 text-purple-950 hover:bg-purple-50/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
              Por Revisar (Admin)
            </span>
            <span
              className={`text-xl font-black mt-1 block ${
                statusFilter === "SOLICITADO" || statusFilter === "POR_REVISAR"
                  ? "text-white"
                  : "text-purple-600 dark:text-purple-300"
              }`}
            >
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
              {isReception && metrics.escalados > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-sm shadow-xs">
                  {metrics.escalados} en rojo
                </span>
              )}
            </div>
            <span
              className={`text-xl font-black mt-1 block ${
                statusFilter === "PARA_ENCARGAR" ? "text-white" : "text-amber-600"
              }`}
            >
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
            <span
              className={`text-xl font-black mt-1 block ${
                statusFilter === "ENCARGO_REALIZADO" ? "text-white" : "text-blue-600"
              }`}
            >
              {metrics.encargados}
            </span>
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
            <span
              className={`text-xl font-black mt-1 block ${
                statusFilter === "RECIBIDO" ? "text-white" : "text-emerald-600"
              }`}
            >
              {metrics.recibidos}
            </span>
          </button>
        </div>
      ) : (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                Total de Pedidos Realizados
              </span>
              <p className="text-xl font-black text-slate-900">
                {filteredRequests.length} pedido{filteredRequests.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      )}

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

        {!isMechanic && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por estado */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Estado:</span>
              <select
                value={statusFilter === "POR_REVISAR" ? "SOLICITADO" : statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="SOLICITADO">1. Solicitados (Por revisar Admin)</option>
                <option value="PARA_ENCARGAR">2. Para encargar (Recepción)</option>
                <option value="ENCARGO_REALIZADO">3. Encargados / En tránsito</option>
                <option value="RECIBIDO">4. Recibidos en Taller</option>
                <option value="PENDIENTES_RECEPCION">Pendientes Recepción</option>
                {isReception && <option value="ESCALADOS">🚨 Demorados en Rojo</option>}
              </select>
            </div>

            {/* Filtro por mecánico */}
            {mechanicsList.length > 0 && (
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
        )}
      </div>

      {/* LISTADO DE PEDIDOS (TABLA / CARDS) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && requests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Cargando pedidos de repuestos...</p>
            <div className="w-48 max-w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mx-auto relative">
              <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 h-full rounded-full animate-loading-bar" />
            </div>
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
              const itemsList = parseSparePartItems(req.itemsAEncargar || req.itemsSolicitados, req.repuestosLista);
              const itemsCount = itemsList.length > 0 ? itemsList.length : 1;

              return (
                <div
                  key={req.id}
                  onClick={() => openDetail(req)}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all cursor-pointer hover:bg-slate-50/80 ${
                    isReception && isEscalated
                      ? "bg-rose-50/70 border-l-4 border-l-rose-600 hover:bg-rose-50"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Vehículo, Orden y Falla */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isReception && isEscalated
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

                        {isReception && isEscalated && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            {`Demorado (> ${SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)`}
                          </span>
                        )}
                        {isReception && !isEscalated && isVencida && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-md uppercase tracking-wider border border-rose-200">
                            Llegada Vencida
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-semibold line-clamp-1">
                        <span className="text-slate-500 font-normal">Falla:</span> {req.fallaReparar}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        {!isMechanic && (
                          <>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              Mecánico:{" "}
                              <strong className="text-slate-700">
                                {req.mechanic?.nombre} {req.mechanic?.apellido || ""}
                              </strong>
                            </span>
                            <span>•</span>
                          </>
                        )}
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
                      {isMechanic ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200">
                          <Package className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pedido Realizado</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      )}

                      <div className="text-[11px] text-slate-500 font-medium flex items-center lg:justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {isMechanic
                            ? `Solicitado el ${new Date(req.createdAt).toLocaleDateString()}`
                            : `Hace ${formatTiempoTranscurrido(getFechaUltimoEstado(req))}`}
                        </span>
                        {!isMechanic && req.fechaEstimadaLlegada && (
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
                  {isReception && isSparePartEscalated(selectedRequest) && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-xs">
                      🚨 Demorado (&gt; {SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)
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
              {!isMechanic ? (
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
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-700">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        Pedido de repuestos registrado
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Solicitado el {new Date(selectedRequest.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
              {userRole === "ADMIN" &&
              (normalizeSparePartStatus(selectedRequest.estado) === "SOLICITADO" ||
                normalizeSparePartStatus(selectedRequest.estado) === "PARA_ENCARGAR") ? (
                /* VISTA ADMIN: EDITOR COMPLETO Y DESTACADO */
                <div className="space-y-4">
                  {/* Referencia: Solicitado por el mecánico */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-500" />
                        <span>Solicitado originalmente por el Mecánico:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopiarSolicitados}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                      >
                        Copiar estos repuestos al editor ↓
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const list = parseSparePartItems(
                          selectedRequest.itemsSolicitados,
                          selectedRequest.repuestosLista
                        );

                        if (list.length > 0) {
                          return list.map((it, idx) => (
                            <span
                              key={it.id || idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                            >
                              <span>{it.descripcion}</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono font-bold text-slate-900">
                                {it.cantidad}x
                              </span>
                            </span>
                          ));
                        }

                        return (
                          <p className="text-xs text-slate-700 font-mono whitespace-pre-line bg-white p-2.5 rounded-xl border border-slate-200 w-full">
                            {selectedRequest.repuestosLista || "Sin repuestos especificados"}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Panel de Edición Admin */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border-2 border-amber-300 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black uppercase tracking-wide text-amber-950">
                          Repuestos a Encargar por Recepción (Lista definitiva)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-[10px] font-black uppercase tracking-wider text-amber-900">
                        Admin Editable
                      </span>
                    </div>

                    <p className="text-xs text-amber-900">
                      Modificá o agregá los repuestos con la cantidad exacta que Recepción debe encargar al proveedor:
                    </p>

                    <div className="space-y-2.5">
                      {itemsAEncargarEditable.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center gap-2 shadow-2xs"
                        >
                          <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
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
                            placeholder="Ej: Pastillas de freno delanteras Brembo, Filtro de aceite Mann..."
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setItemsAEncargarEditable((prev) =>
                                  prev.map((it, i) =>
                                   i === idx ? { ...it, cantidad: Math.max(1, (it.cantidad || 1) - 1) } : it
                                  )
                                )
                              }
                              className="px-2.5 py-1 hover:bg-slate-200 text-slate-700 font-black text-xs transition-colors"
                            >
                              -
                            </button>
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
                              className="w-11 text-xs py-1 bg-white font-mono font-black text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setItemsAEncargarEditable((prev) =>
                                  prev.map((it, i) =>
                                   i === idx ? { ...it, cantidad: (it.cantidad || 1) + 1 } : it
                                  )
                                )
                              }
                              className="px-2.5 py-1 hover:bg-slate-200 text-slate-700 font-black text-xs transition-colors"
                            >
                              +
                            </button>
                          </div>
                          {itemsAEncargarEditable.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setItemsAEncargarEditable((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              title="Eliminar repuesto"
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setItemsAEncargarEditable((prev) => [
                            ...prev,
                            { id: `item-new-${Date.now()}`, descripcion: "", cantidad: 1 },
                          ])
                        }
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/70 hover:bg-amber-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar otro repuesto a la lista</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-amber-200">
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Instrucciones de compra para Recepción (opcional):
                      </label>
                      <input
                        type="text"
                        value={notasAdminInput}
                        onChange={(e) => setNotasAdminInput(e.target.value)}
                        placeholder="Ej: Pedir en Distribuidora Norte con cuenta de taller, o solicitar factura A..."
                        className="w-full text-xs px-3.5 py-2 bg-white rounded-xl border border-amber-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>
              ) : isMechanic ? (
                /* VISTA MECÁNICO: Solo los repuestos que él solicitó */
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      <span>Repuestos solicitados</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const list = parseSparePartItems(
                        selectedRequest.itemsSolicitados,
                        selectedRequest.repuestosLista
                      );

                      if (list.length > 0) {
                        return list.map((it, idx) => (
                          <div
                            key={it.id || idx}
                            className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs"
                          >
                            <span className="font-semibold text-slate-800">
                              {it.descripcion}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-black text-slate-900">
                              {it.cantidad}x
                            </span>
                          </div>
                        ));
                      }

                      return (
                        <p className="text-xs text-slate-700 font-mono whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
                          {selectedRequest.repuestosLista || "Sin repuestos especificados"}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* VISTA GENERAL / SOLO LECTURA (Recepción o Admin) */
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
                        const list = parseSparePartItems(
                          selectedRequest.itemsSolicitados,
                          selectedRequest.repuestosLista
                        );

                        if (list.length > 0) {
                          return list.map((it, idx) => (
                            <div
                              key={it.id || idx}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800">
                                {it.descripcion}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-black text-slate-900">
                                {it.cantidad}x
                              </span>
                            </div>
                          ));
                        }

                        return (
                          <p className="text-xs text-slate-700 font-mono whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
                            {selectedRequest.repuestosLista || "Sin repuestos especificados"}
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

                    <div className="space-y-2">
                      {(() => {
                        const list = parseSparePartItems(selectedRequest.itemsAEncargar);

                        if (list.length > 0) {
                          return list.map((it, idx) => (
                            <div
                              key={it.id || idx}
                              className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-900">
                                {it.descripcion}
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
                  </div>
                </div>
              )}

              {/* 4. Galería de Fotos con Notas Ancladas */}
              {(() => {
                const photoList = parseSparePartPhotos(
                  selectedRequest.fotos,
                  selectedRequest.fotoUrl
                );

                if (photoList.length === 0) return null;

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fotografías con Nota Anclada ({photoList.length})</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {photoList.map((foto, idx) => (
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

              {/* 5. Datos de Encargo y Proveedor (Si ya se encargó, solo para Admin y Recepción) */}
              {!isMechanic && selectedRequest.encargadoPor && (
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

              {/* 6. Datos de Recepción en Taller (Si ya se recibió, solo para Admin y Recepción) */}
              {!isMechanic && selectedRequest.fechaRecepcion && (
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
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                
                {/* ACCIONES DEL ADMINISTRADOR: Solo Aprobar y Pasar a Recepción */}
                {userRole === "ADMIN" &&
                  normalizeSparePartStatus(selectedRequest.estado) === "SOLICITADO" && (
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
                  )}

                {/* ACCIONES DE RECEPCIÓN (Únicamente rol Recepción) */}
                {userRole === "RECEPTION" &&
                  selectedRequest.estado === "PARA_ENCARGAR" && (
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
                  )}

                {/* Confirmar Llegada / Recibido (Únicamente rol Recepción) */}
                {userRole === "RECEPTION" &&
                  selectedRequest.estado === "ENCARGO_REALIZADO" && (
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
                  )}
              </div>
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
