"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  CheckSquare,
  Square,
  ArrowRight,
  ExternalLink,
  User,
  Car,
  Wrench,
  RefreshCw,
  X,
  Loader2,
  ClipboardList,
  Sparkles,
  PlayCircle,
  Building2,
} from "lucide-react";
import { SparePartRequest, SparePartItem } from "@/types";
import { useAppDialog } from "@/components/AppDialog";

export default function RepuestosPage() {
  const { alert, confirm } = useAppDialog();
  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [activeTab, setActiveTab] = useState<"SOLICITUDES_MECANICOS" | "PEDIDOS_RECEPCION">("SOLICITUDES_MECANICOS");

  // Modales
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  
  // Modal de Procesamiento de Admin
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedReqForAdmin, setSelectedReqForAdmin] = useState<SparePartRequest | null>(null);
  const [adminItems, setAdminItems] = useState<SparePartItem[]>([]);
  const [adminProveedor, setAdminProveedor] = useState("");
  const [adminNotas, setAdminNotas] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Modal de Recepción
  const [recepcionModalOpen, setRecepcionModalOpen] = useState(false);
  const [selectedReqForRecepcion, setSelectedReqForRecepcion] = useState<SparePartRequest | null>(null);
  const [recepcionItems, setRecepcionItems] = useState<SparePartItem[]>([]);
  const [remitoNro, setRemitoNro] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  const [reactivarOrden, setReactivarOrden] = useState(true);
  const [savingRecepcion, setSavingRecepcion] = useState(false);

  // Cargar usuario actual
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          const userRole = String(data.user.role || "").toUpperCase();
          // Si el usuario es de recepción, arranca en la pestaña de Recepción por defecto
          if (userRole === "RECEPTION" || userRole === "RECEPCION") {
            setActiveTab("PEDIDOS_RECEPCION");
          }
        }
      })
      .catch((err) => console.error("Error al obtener usuario:", err));
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spare-parts");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes de repuestos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const isAdmin = currentUser?.role === "ADMIN";
  const isReception =
    currentUser?.role === "RECEPTION" ||
    currentUser?.role === "RECEPCION" ||
    currentUser?.role === "ADMIN";

  // =========================================================================
  // HANDLERS PARA ADMINISTRADOR
  // =========================================================================
  const handleOpenAdminModal = (req: SparePartRequest) => {
    setSelectedReqForAdmin(req);
    setAdminProveedor(req.proveedor || "");
    setAdminNotas(req.notasAdmin || "");

    // Si ya tenía items procesados, cargarlos
    if (req.itemsProcesados) {
      try {
        const parsed = JSON.parse(req.itemsProcesados);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdminItems(parsed);
          setAdminModalOpen(true);
          return;
        }
      } catch (e) {
        console.error("Error parsing itemsProcesados:", e);
      }
    }

    // Si es primera vez, pre-parsear el texto libre del mecánico
    const lines = req.repuestosLista
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("Notas adicionales:"));

    const initialItems: SparePartItem[] = [];
    lines.forEach((line, idx) => {
      // Intentar extraer si tiene formato "• 2x Nombre (obs)"
      let cantidad = 1;
      let nombre = line.replace(/^[•\-\*]\s*/, "");
      let observaciones = "";

      const matchCant = nombre.match(/^(\d+)x\s+(.+)$/i);
      if (matchCant) {
        cantidad = parseInt(matchCant[1]) || 1;
        nombre = matchCant[2];
      }

      const matchObs = nombre.match(/^([^\(]+)\s*\((.+)\)$/);
      if (matchObs) {
        nombre = matchObs[1].trim();
        observaciones = matchObs[2].trim();
      }

      initialItems.push({
        id: `item-${Date.now()}-${idx}`,
        nombre: nombre || "Repuesto",
        codigo: "",
        cantidad,
        proveedor: req.proveedor || "",
        notas: observaciones,
        recibido: false,
      });
    });

    if (initialItems.length === 0) {
      initialItems.push({
        id: `item-${Date.now()}-0`,
        nombre: "",
        codigo: "",
        cantidad: 1,
        proveedor: "",
        notas: "",
        recibido: false,
      });
    }

    setAdminItems(initialItems);
    setAdminModalOpen(true);
  };

  const handleAddAdminItem = () => {
    setAdminItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        nombre: "",
        codigo: "",
        cantidad: 1,
        proveedor: adminProveedor,
        notas: "",
        recibido: false,
      },
    ]);
  };

  const handleRemoveAdminItem = (id: string) => {
    if (adminItems.length <= 1) return;
    setAdminItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAdminItemChange = (id: string, field: keyof SparePartItem, value: any) => {
    setAdminItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleSaveAdminProcessing = async () => {
    if (!selectedReqForAdmin) return;

    const validItems = adminItems.filter((it) => it.nombre.trim().length > 0);
    if (validItems.length === 0) {
      await alert({
        title: "Lista requerida",
        message: "Debe ingresar al menos un repuesto para generar la lista que recibirá Recepción.",
        variant: "warning",
      });
      return;
    }

    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedReqForAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROCESAR_ADMIN",
          itemsProcesados: validItems,
          proveedor: adminProveedor.trim() || null,
          notasAdmin: adminNotas.trim() || null,
          estado: "PROCESADO_ADMIN",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al procesar el pedido de repuestos");
      }

      await alert({
        title: "¡Pedido Procesado con Éxito!",
        message: "La lista de repuestos fue formalizada y enviada a la bandeja de Recepción para su control de ingreso.",
        variant: "success",
      });

      setAdminModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "Ocurrió un error al procesar el pedido.",
        variant: "danger",
      });
    } finally {
      setSavingAdmin(false);
    }
  };

  // =========================================================================
  // HANDLERS PARA RECEPCIÓN
  // =========================================================================
  const handleOpenRecepcionModal = (req: SparePartRequest) => {
    setSelectedReqForRecepcion(req);
    setRemitoNro(req.remitoNro || "");
    setNotasRecepcion(req.notasRecepcion || "");
    setReactivarOrden(true);

    let parsedItems: SparePartItem[] = [];
    if (req.itemsProcesados) {
      try {
        parsedItems = JSON.parse(req.itemsProcesados);
      } catch (e) {
        console.error("Error parseando items de recepcion:", e);
      }
    }

    if (parsedItems.length === 0) {
      // Fallback
      parsedItems = [
        {
          id: "item-rec-0",
          nombre: req.repuestosLista,
          cantidad: 1,
          recibido: req.estado === "RECIBIDO_TOTAL",
        },
      ];
    }

    setRecepcionItems(parsedItems);
    setRecepcionModalOpen(true);
  };

  const handleToggleRecepcionItem = (id: string) => {
    setRecepcionItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              recibido: !it.recibido,
              fechaRecibido: !it.recibido ? new Date().toISOString() : undefined,
            }
          : it
      )
    );
  };

  const handleMarcarTodosRecibidos = () => {
    setRecepcionItems((prev) =>
      prev.map((it) => ({
        ...it,
        recibido: true,
        fechaRecibido: new Date().toISOString(),
      }))
    );
  };

  const handleSaveRecepcion = async () => {
    if (!selectedReqForRecepcion) return;

    const allChecked = recepcionItems.length > 0 && recepcionItems.every((it) => it.recibido);
    const anyChecked = recepcionItems.some((it) => it.recibido);

    const nextEstado = allChecked
      ? "RECIBIDO_TOTAL"
      : anyChecked
      ? "RECIBIDO_PARCIAL"
      : "PROCESADO_ADMIN";

    setSavingRecepcion(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedReqForRecepcion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECEPCIONAR",
          itemsProcesados: recepcionItems,
          remitoNro: remitoNro.trim() || null,
          notasRecepcion: notasRecepcion.trim() || null,
          estado: nextEstado,
          reactivarOrden: allChecked && reactivarOrden,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al asentar la recepción");
      }

      await alert({
        title: allChecked ? "¡Repuestos Recepcionados Totalmente!" : "Recepción Asentada",
        message: allChecked
          ? reactivarOrden
            ? "Todos los repuestos ingresaron al taller. La orden fue reactivada a 'En Reparación' para que el mecánico continúe el trabajo."
            : "Todos los repuestos ingresaron al taller y quedaron registrados."
          : "Se guardó el ingreso parcial de repuestos en el control del taller.",
        variant: "success",
      });

      setRecepcionModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "Error al procesar la recepción",
        variant: "danger",
      });
    } finally {
      setSavingRecepcion(false);
    }
  };

  // Filtrado de solicitudes
  const filteredRequests = requests.filter((req) => {
    // Filtro de búsqueda
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchPatente = req.workOrder?.vehicle?.patente?.toLowerCase().includes(q);
      const matchMarca = req.workOrder?.vehicle?.marca?.toLowerCase().includes(q);
      const matchModelo = req.workOrder?.vehicle?.modelo?.toLowerCase().includes(q);
      const matchOrden = String(req.workOrder?.numeroOrden || "").includes(q);
      const matchMecanico = `${req.mechanic?.nombre || ""} ${req.mechanic?.apellido || ""}`
        .toLowerCase()
        .includes(q);
      const matchFalla = req.fallaReparar?.toLowerCase().includes(q);
      const matchRepuestos = req.repuestosLista?.toLowerCase().includes(q);
      const matchProveedor = req.proveedor?.toLowerCase().includes(q);

      if (
        !matchPatente &&
        !matchMarca &&
        !matchModelo &&
        !matchOrden &&
        !matchMecanico &&
        !matchFalla &&
        !matchRepuestos &&
        !matchProveedor
      ) {
        return false;
      }
    }

    // Filtro de pestañas
    if (activeTab === "SOLICITUDES_MECANICOS") {
      // En solicitudes de mecánicos vemos todo, pero principalmente lo que el admin debe procesar
      if (statusFilter === "PENDIENTES") return req.estado === "PENDIENTE_ADMIN";
      if (statusFilter === "PROCESADAS") return req.estado === "PROCESADO_ADMIN";
      if (statusFilter === "RECIBIDAS")
        return req.estado === "RECIBIDO_PARCIAL" || req.estado === "RECIBIDO_TOTAL";
    } else {
      // En pedidos de recepción vemos los pedidos ya procesados por admin o recibidos
      if (statusFilter === "PENDIENTES_LLEGADA") return req.estado === "PROCESADO_ADMIN";
      if (statusFilter === "PARCIALES") return req.estado === "RECIBIDO_PARCIAL";
      if (statusFilter === "COMPLETADOS") return req.estado === "RECIBIDO_TOTAL";
    }

    return true;
  });

  // Métricas
  const totalCount = requests.length;
  const pendientesAdminCount = requests.filter((r) => r.estado === "PENDIENTE_ADMIN").length;
  const enEsperaLlegadaCount = requests.filter(
    (r) => r.estado === "PROCESADO_ADMIN" || r.estado === "RECIBIDO_PARCIAL"
  ).length;
  const recibidosTotalCount = requests.filter((r) => r.estado === "RECIBIDO_TOTAL").length;

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* ENCABEZADO Y TÍTULO                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-700" />
              Módulo de Repuestos & Compras
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Flujo Mecánico ➔ Administración ➔ Recepción
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Gestión de Repuestos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control integral de solicitudes técnicas de mecánicos, formalización de pedidos y control de recepción de piezas.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TARJETAS DE MÉTRICAS RÁPIDAS                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-black text-slate-900 leading-none">
              {pendientesAdminCount}
            </p>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mt-1 truncate">
              Aguardando Admin
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-200/60">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-black text-slate-900 leading-none">
              {enEsperaLlegadaCount}
            </p>
            <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider mt-1 truncate">
              Esperando Llegada
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-black text-slate-900 leading-none">
              {recibidosTotalCount}
            </p>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mt-1 truncate">
              Recibidos en Taller
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-black text-slate-900 leading-none">
              {totalCount}
            </p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1 truncate">
              Total Solicitudes
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELECTOR DE PESTAÑAS (ADMIN / RECEPCIÓN)                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("SOLICITUDES_MECANICOS");
                setStatusFilter("TODOS");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "SOLICITUDES_MECANICOS"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Solicitudes de Mecánicos</span>
              {pendientesAdminCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {pendientesAdminCount}
                </span>
              )}
            </button>
          )}

          {isReception && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("PEDIDOS_RECEPCION");
                setStatusFilter("TODOS");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "PEDIDOS_RECEPCION"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Truck className="w-4 h-4 text-sky-600" />
              <span>Control de Pedidos (Recepción)</span>
              {enEsperaLlegadaCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-black">
                  {enEsperaLlegadaCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por patente, repuesto, orden..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: SOLICITUDES DE MECÁNICOS (ADMINISTRACIÓN)                       */}
      {/* ========================================================================= */}
      {activeTab === "SOLICITUDES_MECANICOS" && (
        <div className="space-y-4">
          {/* Subfiltros de estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Estado:
            </span>
            {[
              { id: "TODOS", label: "Todas las solicitudes" },
              { id: "PENDIENTES", label: "Pendientes de procesar" },
              { id: "PROCESADAS", label: "Procesadas (enviadas a recepción)" },
              { id: "RECIBIDAS", label: "Recibidas en taller" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Listado de tarjetas de solicitud para Administrador */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span>Cargando solicitudes de repuestos...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-800">
                No hay solicitudes de repuestos
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cuando los mecánicos pausen órdenes por repuestos o averías imprevistas, aparecerán listadas aquí con fotos, fallas y piezas requeridas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const vehicle = req.workOrder?.vehicle;
                const client = vehicle?.client;
                const isPendiente = req.estado === "PENDIENTE_ADMIN";
                const isProcesado = req.estado === "PROCESADO_ADMIN";
                const isRecibido = req.estado === "RECIBIDO_TOTAL" || req.estado === "RECIBIDO_PARCIAL";

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-3xl bg-white border transition-all shadow-2xs ${
                      isPendiente
                        ? "border-amber-300 ring-2 ring-amber-100"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Información Principal del Vehículo y Orden */}
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Link
                            href={`/app/ordenes/${req.workOrderId}`}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-black tracking-wider uppercase transition-colors"
                          >
                            Orden #{req.workOrder?.numeroOrden}
                          </Link>

                          {vehicle && (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-xs font-black tracking-widest uppercase">
                              {vehicle.patente}
                            </span>
                          )}

                          <span className="text-sm font-extrabold text-slate-900">
                            {vehicle?.marca} {vehicle?.modelo} ({vehicle?.anio})
                          </span>

                          {/* Badge de Estado */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ml-auto lg:ml-0 ${
                              isPendiente
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : isProcesado
                                ? "bg-sky-100 text-sky-900 border border-sky-300"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            }`}
                          >
                            {isPendiente
                              ? "⚠️ Pendiente de Procesar"
                              : isProcesado
                              ? "📦 Pedido Procesado (En Recepción)"
                              : req.estado === "RECIBIDO_PARCIAL"
                              ? "🚚 Recepcionado Parcial"
                              : "✅ Repuestos en Taller"}
                          </span>
                        </div>

                        {/* Mecánico solicitante y cliente */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Wrench className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Mecánico: {req.mechanic?.nombre} {req.mechanic?.apellido || ""}
                            </span>
                          </span>

                          {client && (
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Cliente: {client.nombre} {client.apellido}
                              </span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            Solicitado el {new Date(req.createdAt).toLocaleString("es-AR")}
                          </span>
                        </div>

                        {/* Bloques de Falla y Repuestos cargados por el mecánico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Falla a Reparar */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Falla / Diagnóstico Informado
                            </span>
                            <p className="text-xs text-slate-800 font-medium whitespace-pre-line">
                              {req.fallaReparar}
                            </p>
                          </div>

                          {/* Repuestos Solicitados */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-slate-600" />
                              Repuestos Requeridos por el Técnico
                            </span>
                            <p className="text-xs text-slate-800 font-mono font-medium whitespace-pre-line">
                              {req.repuestosLista}
                            </p>
                          </div>
                        </div>

                        {/* Si ya fue procesado por el admin, mostrar resumen de lo enviado a recepción */}
                        {req.itemsProcesados && (
                          <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[11px] text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-sky-600" />
                                Lista Oficial Procesada para Recepción
                                {req.proveedor && (
                                  <span className="text-sky-700 font-normal lowercase">
                                    • Proveedor: <strong>{req.proveedor}</strong>
                                  </span>
                                )}
                              </span>
                              {req.fechaProcesado && (
                                <span className="text-[10px] text-sky-700">
                                  Procesado el {new Date(req.fechaProcesado).toLocaleDateString("es-AR")}
                                </span>
                              )}
                            </div>
                            {(() => {
                              try {
                                const items: SparePartItem[] = JSON.parse(req.itemsProcesados);
                                return (
                                  <div className="flex flex-wrap gap-2 pt-0.5">
                                    {items.map((it, idx) => (
                                      <span
                                        key={it.id || idx}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                                          it.recibido
                                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                            : "bg-white text-slate-800 border-sky-200"
                                        }`}
                                      >
                                        <span className="w-2 h-2 rounded-full bg-current" />
                                        <span>
                                          {it.cantidad}x {it.nombre}
                                        </span>
                                        {it.codigo && (
                                          <span className="text-[10px] opacity-70">
                                            [{it.codigo}]
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                );
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Foto y Botones de Acción a la derecha */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* Thumbnail de la foto cargada por el mecánico */}
                        {req.fotoUrl ? (
                          <div
                            onClick={() => setPhotoModalUrl(req.fotoUrl || null)}
                            className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-amber-400 group cursor-pointer shadow-xs transition-all shrink-0 bg-slate-900"
                            title="Haga clic para ver la foto en tamaño completo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={req.fotoUrl}
                              alt="Foto de la avería"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-4 h-4" />
                              <span>Ampliar</span>
                            </div>
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                              📷 FOTO
                            </span>
                          </div>
                        ) : (
                          <div className="w-28 h-28 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-[10px] text-center p-2 shrink-0">
                            <Camera className="w-5 h-5 mb-1 text-slate-300" />
                            <span>Sin foto adjunta</span>
                          </div>
                        )}

                        {/* Botón de Acción Principal para el Administrador */}
                        <div className="space-y-2 w-full lg:w-auto text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenAdminModal(req)}
                            className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isPendiente
                                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20 active:scale-95"
                                : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                            }`}
                          >
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>
                              {isPendiente
                                ? "Procesar y Armar Pedido"
                                : "Editar Pedido Procesado"}
                            </span>
                          </button>

                          <Link
                            href={`/app/ordenes/${req.workOrderId}`}
                            className="block text-[11px] font-bold text-slate-500 hover:text-slate-900 text-center"
                          >
                            Ver Orden Completa ➔
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: CONTROL DE PEDIDOS Y RECEPCIÓN (TABLA POR PEDIDOS)               */}
      {/* ========================================================================= */}
      {activeTab === "PEDIDOS_RECEPCION" && (
        <div className="space-y-4">
          {/* Subfiltros de estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Estado:
            </span>
            {[
              { id: "TODOS", label: "Todos los pedidos" },
              { id: "PENDIENTES_LLEGADA", label: "Aguardando llegada" },
              { id: "PARCIALES", label: "Recepción parcial" },
              { id: "COMPLETADOS", label: "Recibidos totalmente" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-sky-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Tabla de Control de Recepción de Pedidos */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                <span>Cargando pedidos para recepción...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-sm text-slate-800">
                  No hay pedidos pendientes de recepción
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Cuando Administración procese las solicitudes técnicas de los mecánicos, los pedidos aparecerán organizados en esta tabla.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Pedido / Orden</th>
                      <th className="py-3.5 px-4">Vehículo & Patente</th>
                      <th className="py-3.5 px-4">Proveedor</th>
                      <th className="py-3.5 px-4">Repuestos Esperados</th>
                      <th className="py-3.5 px-4">Mecánico</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const vehicle = req.workOrder?.vehicle;
                      const isCompletado = req.estado === "RECIBIDO_TOTAL";
                      const isParcial = req.estado === "RECIBIDO_PARCIAL";
                      const isPendienteLlegada = req.estado === "PROCESADO_ADMIN";
                      const isAguardandoAdmin = req.estado === "PENDIENTE_ADMIN";

                      let itemsParsed: SparePartItem[] = [];
                      if (req.itemsProcesados) {
                        try {
                          itemsParsed = JSON.parse(req.itemsProcesados);
                        } catch {}
                      }

                      const totalItems = itemsParsed.length;
                      const recibidosCount = itemsParsed.filter((it) => it.recibido).length;

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => handleOpenRecepcionModal(req)}
                        >
                          {/* N° Orden */}
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-black">
                              #{req.workOrder?.numeroOrden}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1">
                              {new Date(req.createdAt).toLocaleDateString("es-AR")}
                            </span>
                          </td>

                          {/* Vehículo y Patente */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {vehicle && (
                                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[11px] font-black uppercase tracking-wider">
                                  {vehicle.patente}
                                </span>
                              )}
                              <span className="font-bold text-slate-900">
                                {vehicle?.marca} {vehicle?.modelo}
                              </span>
                            </div>
                          </td>

                          {/* Proveedor */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{req.proveedor || "Sin especificar"}</span>
                            </div>
                            {req.remitoNro && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Remito: {req.remitoNro}
                              </span>
                            )}
                          </td>

                          {/* Repuestos Esperados */}
                          <td className="py-3.5 px-4 max-w-xs">
                            {itemsParsed.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-800">
                                    {recibidosCount} de {totalItems} ítems recibidos
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {Math.round((recibidosCount / totalItems) * 100)}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      isCompletado
                                        ? "bg-emerald-500"
                                        : isParcial
                                        ? "bg-amber-500"
                                        : "bg-sky-400"
                                    }`}
                                    style={{
                                      width: `${(recibidosCount / totalItems) * 100}%`,
                                    }}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {itemsParsed.map((it) => `${it.cantidad}x ${it.nombre}`).join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-600 line-clamp-2">
                                {req.repuestosLista}
                              </span>
                            )}
                          </td>

                          {/* Mecánico */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">
                              {req.mechanic?.nombre} {req.mechanic?.apellido || ""}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isCompletado
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : isParcial
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : isPendienteLlegada
                                  ? "bg-sky-100 text-sky-900 border border-sky-300"
                                  : "bg-slate-100 text-slate-700 border border-slate-300"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                              <span>
                                {isCompletado
                                  ? "Recibido Completo"
                                  : isParcial
                                  ? "Recepción Parcial"
                                  : isPendienteLlegada
                                  ? "Aguardando Llegada"
                                  : "Aguardando Admin"}
                              </span>
                            </span>
                          </td>

                          {/* Botón Acción */}
                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenRecepcionModal(req)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer ${
                                isCompletado
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-sky-600 hover:bg-sky-500 text-white shadow-xs"
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>{isCompletado ? "Ver Detalle" : "Recepcionar"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PROCESAR SOLICITUD (ADMINISTRADOR)                              */}
      {/* ========================================================================= */}
      {adminModalOpen && selectedReqForAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    Panel de Administración
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    Orden #{selectedReqForAdmin.workOrder?.numeroOrden}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>Procesar y Armar Pedido de Repuestos</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Formalice la lista de repuestos requeridos por el mecánico para que Recepción reciba y controle el pedido.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Información cargada por el Mecánico */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-700" />
                    Cargado por el Mecánico: {selectedReqForAdmin.mechanic?.nombre}{" "}
                    {selectedReqForAdmin.mechanic?.apellido || ""}
                  </span>
                  {selectedReqForAdmin.fotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoModalUrl(selectedReqForAdmin.fotoUrl || null)}
                      className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer underline"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ver Foto de la Avería
                    </button>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-800">
                    <strong className="text-amber-950">Falla a reparar:</strong>{" "}
                    {selectedReqForAdmin.fallaReparar}
                  </p>
                  <p className="text-slate-700">
                    <strong className="text-amber-950">Repuestos pedidos:</strong>{" "}
                    {selectedReqForAdmin.repuestosLista}
                  </p>
                </div>
              </div>

              {/* Proveedor y Notas Generales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    Proveedor asignado (Distribuidora / Casa de Repuestos):
                  </label>
                  <input
                    type="text"
                    value={adminProveedor}
                    onChange={(e) => setAdminProveedor(e.target.value)}
                    placeholder="Ej: Warnes Distribuciones / Bosch Argentina"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    Notas o instrucciones para Recepción:
                  </label>
                  <input
                    type="text"
                    value={adminNotas}
                    onChange={(e) => setAdminNotas(e.target.value)}
                    placeholder="Ej: Pedir remito por duplicado / Llega con el chofer del mediodía"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Renglones de Repuestos Formalizados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    Lista de Repuestos a Recibir
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAdminItem}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {adminItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200"
                    >
                      <span className="text-[11px] font-bold text-slate-400 w-5 text-center shrink-0">
                        {index + 1}.
                      </span>

                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) =>
                          handleAdminItemChange(
                            item.id,
                            "cantidad",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-14 px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs text-center font-bold"
                        title="Cantidad"
                      />

                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) =>
                          handleAdminItemChange(item.id, "nombre", e.target.value)
                        }
                        placeholder="Nombre / Descripción de la pieza"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold"
                      />

                      <input
                        type="text"
                        value={item.codigo || ""}
                        onChange={(e) =>
                          handleAdminItemChange(item.id, "codigo", e.target.value)
                        }
                        placeholder="Código / Ref."
                        className="w-28 hidden sm:block px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveAdminItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingAdmin}
                onClick={handleSaveAdminProcessing}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Guardando pedido...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Confirmar y Enviar a Recepción</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECEPCIÓN Y CONTROL DE PEDIDO                                   */}
      {/* ========================================================================= */}
      {recepcionModalOpen && selectedReqForRecepcion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-sky-900 text-white p-5 sm:p-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-sky-400 text-sky-950 text-[10px] font-black uppercase tracking-wider">
                    Control de Recepción
                  </span>
                  <span className="text-sky-200 text-xs font-mono font-bold">
                    Orden #{selectedReqForRecepcion.workOrder?.numeroOrden}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>Recepción y Verificación de Repuestos</span>
                </h3>
                <p className="text-xs text-sky-200 mt-0.5">
                  Tilde los repuestos que llegaron del proveedor para asentar su ingreso al taller.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRecepcionModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-sky-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Datos del Pedido */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold text-sky-900 uppercase block">
                    Vehículo
                  </span>
                  <p className="font-bold text-slate-900">
                    {selectedReqForRecepcion.workOrder?.vehicle?.marca}{" "}
                    {selectedReqForRecepcion.workOrder?.vehicle?.modelo}
                  </p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                    {selectedReqForRecepcion.workOrder?.vehicle?.patente}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-sky-900 uppercase block">
                    Mecánico Asignado
                  </span>
                  <p className="font-bold text-slate-900">
                    {selectedReqForRecepcion.mechanic?.nombre}{" "}
                    {selectedReqForRecepcion.mechanic?.apellido || ""}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Proveedor: {selectedReqForRecepcion.proveedor || "No indicado"}
                  </p>
                </div>
              </div>

              {/* Nro de Remito y Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    N° de Remito o Factura del Proveedor:
                  </label>
                  <input
                    type="text"
                    value={remitoNro}
                    onChange={(e) => setRemitoNro(e.target.value)}
                    placeholder="Ej: R-0001-00028475"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    Observaciones de Recepción:
                  </label>
                  <input
                    type="text"
                    value={notasRecepcion}
                    onChange={(e) => setNotasRecepcion(e.target.value)}
                    placeholder="Ej: Llegó todo en caja cerrada sin golpes"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Checklist de Repuestos */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-sky-600" />
                    Checklist de Repuestos Recibidos
                  </label>
                  <button
                    type="button"
                    onClick={handleMarcarTodosRecibidos}
                    className="text-xs text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
                  >
                    Marcar todos recibidos
                  </button>
                </div>

                <div className="space-y-2">
                  {recepcionItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleRecepcionItem(item.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        item.recibido
                          ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                            item.recibido
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-slate-300 text-transparent"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">
                            {item.cantidad}x {item.nombre}
                          </span>
                          {item.codigo && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Cód: {item.codigo}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          item.recibido
                            ? "bg-emerald-200/80 text-emerald-900"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {item.recibido ? "Recibido" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opción para reactivar la orden a En Reparación automáticamente */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reactivarOrden}
                    onChange={(e) => setReactivarOrden(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-extrabold text-emerald-950">
                    Si todos los repuestos están recibidos, reanudar la orden automáticamente a &ldquo;En Reparación&rdquo;
                  </span>
                </label>
                <p className="text-[11px] text-emerald-800 mt-1 pl-6">
                  Le avisará al taller que los repuestos están listos para ser colocados, eliminando el estado de pausa.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRecepcionModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={savingRecepcion}
                onClick={handleSaveRecepcion}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingRecepcion ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Guardar Recepción</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VISOR DE FOTO COMPLETO (LIGHTBOX)                                */}
      {/* ========================================================================= */}
      {photoModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPhotoModalUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPhotoModalUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoModalUrl}
              alt="Evidencia en tamaño completo"
              className="max-h-[80vh] w-auto object-contain rounded-2xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
