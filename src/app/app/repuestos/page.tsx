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
  Car,
  PauseCircle,
  Check,
  Boxes,
  Layers,
  Tag,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Edit3,
} from "lucide-react";
import { SparePartRequest, SparePartItem } from "@/types";
import ModalPortal from "@/components/ModalPortal";
import { useAppDialog } from "@/components/AppDialog";
import { normalizeRole } from "@/lib/roles";
import { getStatusInfo as getOrderStatusInfo } from "@/lib/order-status";
import {
  SPARE_PARTS_CONFIG,
  SPARE_PART_STATUS_MAP,
  normalizeSparePartStatus,
  isSparePartEscalated,
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
  const initialTab = searchParams.get("tab") === "stock" ? "stock" : "pedidos";

  // Control de pestaña principal: Pedidos vs Stock Cargado
  const [activeMainTab, setActiveMainTab] = useState<"pedidos" | "stock">(initialTab);

  // Estados de Stock Cargado / Inventario
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("TODAS");

  // Modales de Stock: Crear o Editar repuesto
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedStockItem, setSelectedStockItem] = useState<any | null>(null);
  const [stockSaving, setStockSaving] = useState(false);

  const [stockForm, setStockForm] = useState({
    nombre: "",
    codigo: "",
    categoria: "Mecánica General",
    stock: 1,
    precioVenta: 0,
  });

  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(15);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(15);
      return;
    }
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return prev;
        const diff = Math.max(1, Math.floor((95 - prev) * 0.14));
        return Math.min(95, prev + diff);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [loading]);
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

  const [remitoNroInput, setRemitoNroInput] = useState("");
  const [notasRecepcionInput, setNotasRecepcionInput] = useState("");

  // Modal de foto grande (lightbox)
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Estados para Modal de Nuevo Encargue (Recepción y Administrador)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [orderAnchorMode, setOrderAnchorMode] = useState<"ANCHORED" | "GENERAL">("ANCHORED");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("");
  const [pausarVehiculo, setPausarVehiculo] = useState<boolean>(true);
  const [orderSearchText, setOrderSearchText] = useState<string>("");

  const [encargoItems, setEncargoItems] = useState<{ id: string; descripcion: string; cantidad: number }[]>([
    { id: "item-0", descripcion: "", cantidad: 1 },
  ]);
  const [newProveedor, setNewProveedor] = useState("");
  const [newFechaEstimada, setNewFechaEstimada] = useState("");
  const [newMotivo, setNewMotivo] = useState("");
  const [newObservaciones, setNewObservaciones] = useState("");
  const [marcarComoEncargado, setMarcarComoEncargado] = useState(false);

  // Obtener usuario actual
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          const r = normalizeRole(data.user.role);

          // Filtro por defecto: Total de pedidos para todos los roles
          if (!initialEstado) {
            setStatusFilter("TODOS");
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

  // Gestión del Formulario de Nuevo Encargue
  const resetCreateForm = () => {
    setOrderAnchorMode("ANCHORED");
    setSelectedWorkOrderId("");
    setPausarVehiculo(true);
    setOrderSearchText("");
    setEncargoItems([{ id: `item-${Date.now()}-0`, descripcion: "", cantidad: 1 }]);
    setNewProveedor("");
    setNewFechaEstimada("");
    setNewMotivo("");
    setNewObservaciones("");
    setMarcarComoEncargado(false);
  };

  const handleAddEncargoItem = () => {
    setEncargoItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, descripcion: "", cantidad: 1 },
    ]);
  };

  const handleRemoveEncargoItem = (idx: number) => {
    setEncargoItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateEncargoItem = (idx: number, field: "descripcion" | "cantidad", val: any) => {
    setEncargoItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
    );
  };

  useEffect(() => {
    if (createModalOpen) {
      setLoadingOrders(true);
      fetch("/api/work-orders")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.orders) {
            const active = data.orders.filter(
              (o: any) =>
                o.estado !== "CANCELADO" &&
                o.estado !== "ENTREGADO" &&
                o.estado !== "ARCHIVADO"
            );
            setActiveOrders(active);
          }
        })
        .catch((err) => console.error("Error al cargar órdenes de trabajo:", err))
        .finally(() => setLoadingOrders(false));
    }
  }, [createModalOpen]);

  const filteredOrdersForSelector = useMemo(() => {
    if (!orderSearchText.trim()) return activeOrders;
    const q = orderSearchText.toLowerCase().trim();
    return activeOrders.filter((o) => {
      const nro = String(o.numeroOrden || "");
      const pat = (o.vehicle?.patente || "").toLowerCase();
      const cli = `${o.vehicle?.client?.nombre || ""} ${o.vehicle?.client?.apellido || ""}`.toLowerCase();
      const veh = `${o.vehicle?.marca || ""} ${o.vehicle?.modelo || ""}`.toLowerCase();
      return nro.includes(q) || pat.includes(q) || cli.includes(q) || veh.includes(q);
    });
  }, [activeOrders, orderSearchText]);

  const selectedOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return activeOrders.find((o) => o.id === selectedWorkOrderId) || null;
  }, [activeOrders, selectedWorkOrderId]);

  const handleCreateEncargo = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = encargoItems
      .filter((it) => it.descripcion && it.descripcion.trim().length > 0)
      .map((it) => ({
        id: it.id,
        descripcion: it.descripcion.trim(),
        cantidad: Math.max(1, Number(it.cantidad) || 1),
      }));

    if (validItems.length === 0) {
      await alert({
        title: "Repuestos requeridos",
        message: "Por favor agrega al menos un repuesto a encargar con su descripción.",
        variant: "warning",
      });
      return;
    }

    if (orderAnchorMode === "ANCHORED" && !selectedWorkOrderId) {
      await alert({
        title: "Orden de trabajo requerida",
        message: "Seleccionaste anclar a una orden de trabajo. Por favor elige una orden o selecciona 'Pedido General / Stock de Taller'.",
        variant: "warning",
      });
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: orderAnchorMode === "ANCHORED" ? selectedWorkOrderId : null,
          itemsAEncargar: validItems,
          itemsSolicitados: validItems,
          fallaReparar: newMotivo.trim() || undefined,
          proveedor: newProveedor.trim() || undefined,
          fechaEstimadaLlegada: newFechaEstimada || undefined,
          observacionesMecanico: newObservaciones.trim() || undefined,
          pausarVehiculo: orderAnchorMode === "ANCHORED" ? pausarVehiculo : false,
          marcarComoEncargado: marcarComoEncargado || Boolean(newProveedor.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear el encargue de repuestos");
      }

      await alert({
        title: "¡Encargue Creado!",
        message: data.message || "El encargo de repuestos se creó con éxito.",
        variant: "success",
      });

      setCreateModalOpen(false);
      resetCreateForm();
      fetchRequests(false);
    } catch (err: any) {
      await alert({
        title: "Error al crear encargue",
        message: err.message || "Ocurrió un error inesperado al guardar el encargo.",
        variant: "danger",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // =========================================================================
  // GESTIÓN DE STOCK E INVENTARIO
  // =========================================================================
  const fetchInventory = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoadingInventory(true);
      const res = await fetch("/api/inventory", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al consultar inventario");
      const data = await res.json();
      if (data?.items) {
        setInventoryItems(data.items);
      }
      if (data?.stats) {
        setInventoryStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error al cargar inventario:", err);
    } finally {
      if (!silent) setLoadingInventory(false);
    }
  }, []);

  useEffect(() => {
    if (activeMainTab === "stock" && inventoryItems.length === 0) {
      fetchInventory();
    }
  }, [activeMainTab, inventoryItems.length, fetchInventory]);

  const inventoryCategories = useMemo(() => {
    const set = new Set<string>();
    inventoryItems.forEach((it) => {
      if (it.categoria) set.add(it.categoria);
    });
    return Array.from(set);
  }, [inventoryItems]);

  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter((it) => {
      if (inventoryCategoryFilter !== "TODAS" && it.categoria !== inventoryCategoryFilter) {
        return false;
      }

      if (inventoryStatusFilter === "OUT_OF_STOCK") {
        if (it.stock > 0) return false;
      } else if (inventoryStatusFilter === "IN_STOCK") {
        if (it.stock <= 0) return false;
      }

      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase().trim();
        const nom = (it.nombre || "").toLowerCase();
        const cod = (it.codigo || "").toLowerCase();
        const cat = (it.categoria || "").toLowerCase();
        return nom.includes(q) || cod.includes(q) || cat.includes(q);
      }

      return true;
    });
  }, [inventoryItems, inventoryCategoryFilter, inventoryStatusFilter, inventorySearch]);

  const handleQuickStockAdjust = async (item: any, delta: number) => {
    const newStock = Math.max(0, item.stock + delta);
    if (newStock === item.stock) return;

    setInventoryItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, stock: newStock } : it))
    );

    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) throw new Error("Error al actualizar stock");
      const data = await res.json();
      if (data?.item) {
        setInventoryItems((prev) =>
          prev.map((it) => (it.id === item.id ? data.item : it))
        );
      }
      fetchInventory(true);
    } catch (err: any) {
      fetchInventory(true);
      await alert({
        title: "Error",
        message: err.message || "No se pudo actualizar el stock",
        variant: "danger",
      });
    }
  };

  const handleDeleteStockItem = async (item: any) => {
    const ok = await confirm({
      title: "¿Eliminar repuesto del stock?",
      message: `¿Estás seguro de que deseas eliminar "${item.nombre}" (${item.codigo || "Sin código"}) del inventario? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar repuesto");
      setInventoryItems((prev) => prev.filter((it) => it.id !== item.id));
      await alert({
        title: "Repuesto eliminado",
        message: `"${item.nombre}" fue eliminado del catálogo.`,
        variant: "success",
      });
      fetchInventory(true);
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo eliminar el repuesto.",
        variant: "danger",
      });
    }
  };

  const openCreateStockItem = () => {
    setStockModalMode("CREATE");
    setSelectedStockItem(null);
    setStockForm({
      nombre: "",
      codigo: "",
      categoria: "Mecánica General",
      stock: 1,
      precioVenta: 0,
    });
    setStockModalOpen(true);
  };

  const openEditStockItem = (item: any) => {
    setStockModalMode("EDIT");
    setSelectedStockItem(item);
    setStockForm({
      nombre: item.nombre || "",
      codigo: item.codigo || "",
      categoria: item.categoria || "Mecánica General",
      stock: item.stock || 0,
      precioVenta: item.precioVenta || 0,
    });
    setStockModalOpen(true);
  };

  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.nombre.trim()) {
      await alert({
        title: "Nombre requerido",
        message: "Por favor ingresa el nombre o descripción del repuesto.",
        variant: "warning",
      });
      return;
    }

    setStockSaving(true);
    try {
      if (stockModalMode === "CREATE") {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: stockForm.nombre.trim(),
            codigo: stockForm.codigo.trim() || undefined,
            categoria: stockForm.categoria || "Mecánica General",
            cantidad: Number(stockForm.stock) || 0,
            precioVenta: Number(stockForm.precioVenta) || 0,
          }),
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Error al crear repuesto");
        }

        await alert({
          title: "¡Repuesto Cargado!",
          message: "El repuesto fue ingresado al inventario con éxito.",
          variant: "success",
        });
      } else if (stockModalMode === "EDIT" && selectedStockItem) {
        const res = await fetch(`/api/inventory/${selectedStockItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: stockForm.nombre.trim(),
            codigo: stockForm.codigo.trim() || undefined,
            categoria: stockForm.categoria || "Mecánica General",
            stock: Number(stockForm.stock) || 0,
            precioVenta: Number(stockForm.precioVenta) || 0,
          }),
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Error al actualizar repuesto");
        }

        await alert({
          title: "¡Repuesto Actualizado!",
          message: "Los datos del repuesto se actualizaron con éxito.",
          variant: "success",
        });
      }

      setStockModalOpen(false);
      fetchInventory(true);
    } catch (err: any) {
      await alert({
        title: "Error",
        message: err.message || "No se pudo guardar el repuesto.",
        variant: "danger",
      });
    } finally {
      setStockSaving(false);
    }
  };

  const handleOrderFromStock = (item: any) => {
    resetCreateForm();
    setEncargoItems([
      {
        id: `item-${Date.now()}-0`,
        descripcion: `${item.nombre}${item.codigo ? ` (${item.codigo})` : ""}`,
        cantidad: 1,
      },
    ]);
    setNewMotivo(`Reposición de stock: ${item.nombre}`);
    setOrderAnchorMode("GENERAL");
    setCreateModalOpen(true);
  };

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

  const handleRecepcionMarcarRecibido = async (pedidoId?: string) => {
    const targetId = pedidoId || selectedRequest?.id;
    if (!targetId) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${targetId}`, {
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
        title: "¡Repuestos Recibidos en Taller!",
        message:
          "Se confirmó la llegada de los repuestos. El pedido fue archivado en 'Completados' y la orden de trabajo del mecánico se reanudó automáticamente.",
        variant: "success",
      });

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

        // Pedidos archivados/completados (RECIBIDO) van al final de la lista
        const aIsRecibido = a.estado === "RECIBIDO";
        const bIsRecibido = b.estado === "RECIBIDO";
        if (aIsRecibido && !bIsRecibido) return 1;
        if (!aIsRecibido && bIsRecibido) return -1;

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
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
              activeMainTab === "stock"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600"
                : "bg-amber-500/15 border border-amber-500/30 text-amber-600"
            }`}>
              {activeMainTab === "stock" ? <Boxes className="w-6 h-6" /> : <Package className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeMainTab === "stock"
                  ? "Stock de Repuestos e Inventario"
                  : isMechanic
                  ? "Mis Pedidos de Repuestos"
                  : "Pedido y Seguimiento de Repuestos"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {activeMainTab === "stock"
                  ? "Control de existencias físicas, piezas disponibles en depósito y alertas de reposición"
                  : isMechanic
                  ? "Historial de repuestos que has solicitado para tus órdenes de trabajo"
                  : "Gestión integral de pausas mecánicas, revisión de ítems, encargos y recepción"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isMechanic && activeMainTab === "pedidos" && (
            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Encargue</span>
            </button>
          )}

          {!isMechanic && activeMainTab === "stock" && (
            <button
              type="button"
              onClick={openCreateStockItem}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cargar Repuesto a Stock</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (activeMainTab === "stock") {
                fetchInventory(false);
              } else {
                fetchRequests(false);
              }
            }}
            disabled={loading || loadingInventory}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || loadingInventory) ? "animate-spin text-amber-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* TABS DE SELECCIÓN DE VISTA: PEDIDOS Y ENCARGOS vs STOCK CARGADO */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveMainTab("pedidos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeMainTab === "pedidos"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Truck className={`w-4 h-4 ${activeMainTab === "pedidos" ? "text-amber-600" : "text-slate-400"}`} />
          <span>Pedidos y Encargos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeMainTab === "pedidos" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
          }`}>
            {requests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab("stock");
            if (inventoryItems.length === 0) fetchInventory();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeMainTab === "stock"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Boxes className={`w-4 h-4 ${activeMainTab === "stock" ? "text-emerald-600" : "text-slate-400"}`} />
          <span>Stock Cargado / Inventario</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeMainTab === "stock" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
          }`}>
            {inventoryStats?.totalUnitsInStock ?? inventoryItems.reduce((acc, it) => acc + (it.stock || 0), 0)} u.
          </span>
        </button>
      </div>

      {activeMainTab === "pedidos" ? (
        <>
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                Archivados / Completados
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-sm">
                Recibidos
              </span>
            </div>
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
                <option value="RECIBIDO">4. Archivados / Completados (Recibidos en Taller)</option>
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
            <p className="text-xs font-bold text-slate-700">Cargando pedidos de repuestos...</p>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-mono font-black text-amber-800">{loadingProgress}%</span>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No se encontraron pedidos de repuestos</p>
            <p className="text-xs text-slate-400">
              Prueba cambiando los filtros seleccionados o la búsqueda.
            </p>
            {!isMechanic && (
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setCreateModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Encargue</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => {
              const st = normalizeSparePartStatus(req.estado);
              const statusInfo = SPARE_PART_STATUS_MAP[st] || SPARE_PART_STATUS_MAP.SOLICITADO;
              const isEscalated = isSparePartEscalated(req);

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
                        {req.workOrder ? (
                          <>
                            <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              Orden #{req.workOrder.numeroOrden}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-mono text-[11px] font-black rounded-md">
                              {req.workOrder.vehicle?.patente || "SIN PATENTE"}
                            </span>
                            <span className="text-xs font-bold text-slate-700 truncate">
                              {req.workOrder.vehicle?.marca} {req.workOrder.vehicle?.modelo}
                            </span>
                          </>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-md border border-slate-200">
                            Encargue General / Stock Taller
                          </span>
                        )}

                        {isReception && isEscalated && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            {`Demorado (> ${SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)`}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-semibold line-clamp-1">
                        <span className="text-slate-500 font-normal">Falla / Motivo:</span> {req.fallaReparar}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        {!isMechanic && req.mechanic && (
                          <>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              Mecánico:{" "}
                              <strong className="text-slate-700">
                                {req.mechanic.nombre} {req.mechanic.apellido || ""}
                              </strong>
                            </span>
                            <span>•</span>
                          </>
                        )}
                        {req.workOrder?.vehicle?.client && (
                          <>
                            <span>
                              Cliente: {req.workOrder.vehicle.client.nombre}{" "}
                              {req.workOrder.vehicle.client.apellido || ""}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{itemsCount} repuesto(s)</span>
                        {req.proveedor && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600">Proveedor: <strong className="text-slate-800">{req.proveedor}</strong></span>
                          </>
                        )}
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
      </>
      ) : (
        /* VISTA DE STOCK CARGADO / INVENTARIO */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* TARJETAS DE MÉTRICAS DE STOCK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInventoryStatusFilter("ALL")}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                inventoryStatusFilter === "ALL"
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                Piezas en Catálogo
              </span>
              <span className="text-xl font-black mt-1 block">
                {inventoryStats?.totalCatalogItems ?? inventoryItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInventoryStatusFilter("IN_STOCK")}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                inventoryStatusFilter === "IN_STOCK"
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-md"
                  : "bg-white border-emerald-200 text-emerald-950 hover:bg-emerald-50/50"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                Unidades Físicas en Stock
              </span>
              <span className={`text-xl font-black mt-1 block ${inventoryStatusFilter === "IN_STOCK" ? "text-white" : "text-emerald-600"}`}>
                {inventoryStats?.totalUnitsInStock ?? inventoryItems.reduce((acc, it) => acc + Math.max(0, it.stock || 0), 0)} u.
              </span>
            </button>
          </div>

          {/* BARRA DE FILTROS Y BÚSQUEDA DE STOCK */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Buscar repuesto por nombre, código de pieza o categoría..."
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por estado */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400">Estado:</span>
                <select
                  value={inventoryStatusFilter}
                  onChange={(e: any) => setInventoryStatusFilter(e.target.value)}
                  className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Todos los repuestos</option>
                  <option value="IN_STOCK">En Stock (&gt; 0)</option>
                  <option value="OUT_OF_STOCK">🚨 Agotados (0 u.)</option>
                </select>
              </div>

              {/* Filtro por categoría */}
              {inventoryCategories.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">Categoría:</span>
                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                    className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="TODAS">Todas las categorías</option>
                    {inventoryCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* LISTADO / TABLA DE REPUESTOS EN STOCK */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingInventory && inventoryItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Cargando inventario de repuestos...</p>
              </div>
            ) : filteredInventoryItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No se encontraron repuestos en stock</p>
                <p className="text-xs text-slate-400">
                  {inventorySearch || inventoryStatusFilter !== "ALL" || inventoryCategoryFilter !== "TODAS"
                    ? "Prueba cambiando los filtros seleccionados."
                    : "Comienza cargando repuestos al inventario de tu taller."}
                </p>
                {!isMechanic && (
                  <button
                    type="button"
                    onClick={openCreateStockItem}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cargar Primer Repuesto</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[10px] uppercase font-black tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Código / Ref.</th>
                      <th className="py-3.5 px-4">Descripción del Repuesto</th>
                      <th className="py-3.5 px-4">Categoría</th>
                      <th className="py-3.5 px-4 text-center">Stock Actual</th>
                      <th className="py-3.5 px-4 text-right">Precio Venta</th>
                      <th className="py-3.5 px-4 text-center">Ajuste</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredInventoryItems.map((item) => {
                      const isOutOfStock = item.stock <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Código */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {item.codigo ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-900 text-[11px]">
                                {item.codigo}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">S/C</span>
                            )}
                          </td>

                          {/* Nombre */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{item.nombre}</span>
                          </td>

                          {/* Categoría */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{item.categoria || "General"}</span>
                            </span>
                          </td>

                          {/* Stock badge */}
                          <td className="py-3.5 px-4 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>Agotado (0)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>{item.stock} unidades</span>
                              </span>
                            )}
                          </td>

                          {/* Precio Venta */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono text-slate-900 font-bold">
                              {Number(item.precioVenta || 0).toLocaleString("es-ES")} €
                            </span>
                          </td>

                          {/* Ajuste rápido */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={isMechanic || item.stock <= 0}
                                onClick={() => handleQuickStockAdjust(item, -1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-all cursor-pointer"
                                title="Restar 1 unidad"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-mono font-black text-xs text-slate-900">
                                {item.stock}
                              </span>
                              <button
                                type="button"
                                disabled={isMechanic}
                                onClick={() => handleQuickStockAdjust(item, 1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-all cursor-pointer"
                                title="Sumar 1 unidad"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isOutOfStock && !isMechanic && (
                                <button
                                  type="button"
                                  onClick={() => handleOrderFromStock(item)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                  title="Crear encargue de reposición"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Pedir</span>
                                </button>
                              )}

                              {!isMechanic && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditStockItem(item)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                                    title="Editar repuesto"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStockItem(item)}
                                    className="p-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-all cursor-pointer"
                                    title="Eliminar del catálogo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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
      {/* MODAL CREAR ENCARGUE DE REPUESTOS (RECEPCIÓN Y ADMINISTRADOR)            */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <span>Nuevo Encargue de Repuestos</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Crea un encargo de piezas para un vehículo en taller o para stock general del taller.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateEncargo} className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
                
                {/* 1. SECCIÓN DE ANCLAJE A ORDEN DE TRABAJO */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                        1. Destino del Encargo
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        ¿Deseas anclar este pedido a una orden de trabajo existente?
                      </h4>
                    </div>

                    {/* Selector de Modo */}
                    <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setOrderAnchorMode("ANCHORED")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          orderAnchorMode === "ANCHORED"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Car className="w-3.5 h-3.5 text-amber-600" />
                        <span>Anclar a Orden</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOrderAnchorMode("GENERAL");
                          setSelectedWorkOrderId("");
                          setPausarVehiculo(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          orderAnchorMode === "GENERAL"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span>Stock General Taller</span>
                      </button>
                    </div>
                  </div>

                  {orderAnchorMode === "ANCHORED" ? (
                    <div className="space-y-3 pt-1">
                      {!selectedOrder ? (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Buscar y seleccionar orden de trabajo activa:
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={orderSearchText}
                              onChange={(e) => setOrderSearchText(e.target.value)}
                              placeholder="Escribe patente, orden #, cliente o modelo..."
                              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          {loadingOrders ? (
                            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                              <span>Cargando órdenes del taller...</span>
                            </div>
                          ) : filteredOrdersForSelector.length === 0 ? (
                            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                              No se encontraron órdenes activas que coincidan con la búsqueda.
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              {filteredOrdersForSelector.slice(0, 8).map((order) => {
                                const stInfo = getOrderStatusInfo(order.estado);
                                return (
                                  <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedWorkOrderId(order.id);
                                      if (order.estado !== "EN_ESPERA_REPUESTOS") {
                                        setPausarVehiculo(true);
                                      }
                                    }}
                                    className="w-full p-2.5 text-left hover:bg-amber-50/60 flex items-center justify-between gap-3 transition-all cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                        Orden #{order.numeroOrden}
                                      </span>
                                      <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-mono text-[11px] font-black rounded shrink-0">
                                        {order.vehicle?.patente || "SIN PATENTE"}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 truncate">
                                        {order.vehicle?.marca} {order.vehicle?.modelo}
                                      </span>
                                      <span className="text-xs text-slate-500 truncate hidden sm:inline">
                                        • {order.vehicle?.client?.nombre} {order.vehicle?.client?.apellido || ""}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${stInfo.badgeClass}`}>
                                      {stInfo.shortLabel}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Orden Seleccionada */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300 flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                                  Orden #{selectedOrder.numeroOrden}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-mono text-xs font-black rounded-md">
                                  {selectedOrder.vehicle?.patente}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {selectedOrder.vehicle?.marca} {selectedOrder.vehicle?.modelo}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Cliente: <strong className="text-slate-800">{selectedOrder.vehicle?.client?.nombre} {selectedOrder.vehicle?.client?.apellido || ""}</strong> • Tel: {selectedOrder.vehicle?.client?.telefono || "S/D"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWorkOrderId("");
                                setPausarVehiculo(false);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all cursor-pointer shrink-0"
                            >
                              Cambiar orden
                            </button>
                          </div>

                          {/* CHECKBOX / CONTROL PARA PAUSAR EL VEHÍCULO */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            pausarVehiculo
                              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                              : "bg-white border-slate-200"
                          }`}>
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={pausarVehiculo}
                                onChange={(e) => setPausarVehiculo(e.target.checked)}
                                className="w-5 h-5 rounded-md text-amber-600 border-slate-300 focus:ring-amber-500 mt-0.5 cursor-pointer"
                              />
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <PauseCircle className="w-4 h-4 text-amber-600" />
                                  <span>Pausar vehículo inmediatamente por espera de repuestos</span>
                                </span>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                  La orden pasará al estado <strong>"En Pausa" (Esperando Repuestos)</strong>. Cuando los repuestos sean recibidos en recepción, la orden se reanudará automáticamente a "En Reparación".
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center gap-2 font-medium">
                      <Package className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Este encargo se registrará como repuestos de stock general del taller, sin pausar ningún vehículo.</span>
                    </div>
                  )}
                </div>

                {/* 2. SECCIÓN: REPUESTOS A ENCARGAR (LISTA DINÁMICA) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                        2. Repuestos Requeridos
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Lista de piezas o materiales a encargar <span className="text-rose-500">*</span>
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddEncargoItem}
                      className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Repuesto</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {encargoItems.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                          #{index + 1}
                        </span>

                        <input
                          type="text"
                          required
                          value={item.descripcion}
                          onChange={(e) => handleUpdateEncargoItem(index, "descripcion", e.target.value)}
                          placeholder="Descripción del repuesto (ej: Kit distribución, Pastillas delanteras, Filtro de aceite...)"
                          className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                        />

                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Cant:</span>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            required
                            value={item.cantidad}
                            onChange={(e) => handleUpdateEncargoItem(index, "cantidad", e.target.value)}
                            className="w-12 text-xs font-bold text-center border-none bg-transparent focus:outline-hidden"
                          />
                        </div>

                        {encargoItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEncargoItem(index)}
                            className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. SECCIÓN: PROVEEDOR Y SEGUIMIENTO (OPCIONAL) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                      3. Datos de Compra y Proveedor (Opcional)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      ¿Ya tienes asignado el proveedor o la fecha de entrega?
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Proveedor / Casa de Repuestos:
                      </label>
                      <input
                        type="text"
                        value={newProveedor}
                        onChange={(e) => {
                          setNewProveedor(e.target.value);
                          if (e.target.value.trim() && !marcarComoEncargado) {
                            setMarcarComoEncargado(true);
                          }
                        }}
                        placeholder="Ej: Bosch, Valeo, Recambios Valencia, etc."
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Fecha estimada de entrega:
                      </label>
                      <input
                        type="date"
                        value={newFechaEstimada}
                        onChange={(e) => setNewFechaEstimada(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={marcarComoEncargado}
                        onChange={(e) => setMarcarComoEncargado(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-800">
                          Marcar como ya encargado al proveedor (En tránsito / esperando llegada)
                        </strong>
                        <span className="text-slate-500 block text-[11px]">
                          {marcarComoEncargado
                            ? "El pedido quedará registrado en estado 'Encargado / En tránsito'."
                            : "El pedido quedará en estado 'Para Encargar' para que el equipo lo tramite."}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 4. SECCIÓN: MOTIVO Y OBSERVACIONES */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                      4. Diagnóstico o Motivo del Encargue
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Falla o Motivo de la solicitud:
                    </label>
                    <input
                      type="text"
                      value={newMotivo}
                      onChange={(e) => setNewMotivo(e.target.value)}
                      placeholder="Ej: Cambio de pastillas por desgaste excesivo / Service mayor"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Observaciones o Notas internas:
                    </label>
                    <textarea
                      rows={2}
                      value={newObservaciones}
                      onChange={(e) => setNewObservaciones(e.target.value)}
                      placeholder="Instrucciones para recepción, condiciones de pago o detalles del proveedor..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium resize-none"
                    />
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={createLoading}
                    onClick={() => {
                      setCreateModalOpen(false);
                      resetCreateForm();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando encargue...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirmar y Crear Encargue</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALLE COMPLETO DEL PEDIDO                                         */}
      {/* ========================================================================= */}
      {detailModalOpen && selectedRequest && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 font-mono text-xs font-black uppercase tracking-wider">
                    Pedido #{selectedRequest.id.slice(-4)}
                  </span>
                  {selectedRequest.workOrder && (
                    <span className="text-slate-300 text-xs font-medium">
                      Orden #{selectedRequest.workOrder.numeroOrden}
                    </span>
                  )}
                  {isReception && isSparePartEscalated(selectedRequest) && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-xs">
                      🚨 Demorado (&gt; {SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)
                    </span>
                  )}
                </div>
                {selectedRequest.workOrder ? (
                  <>
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <span>
                        {selectedRequest.workOrder.vehicle?.marca}{" "}
                        {selectedRequest.workOrder.vehicle?.modelo}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-mono text-xs rounded border border-white/20">
                        {selectedRequest.workOrder.vehicle?.patente}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Cliente: {selectedRequest.workOrder.vehicle?.client?.nombre}{" "}
                      {selectedRequest.workOrder.vehicle?.client?.apellido || ""} • Tel:{" "}
                      {selectedRequest.workOrder.vehicle?.client?.telefono || "S/D"}
                    </p>
                  </>
                ) : (
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <span>Encargue General / Stock de Taller</span>
                  </h3>
                )}
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
                      disabled={actionLoading}
                      onClick={() => handleRecepcionMarcarRecibido(selectedRequest.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Confirmar Recepción de Repuestos</span>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL ENCARGO REALIZADO (RECEPCIÓN)                                       */}
      {/* ========================================================================= */}
      {encargoModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
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
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL CARGAR / EDITAR REPUESTO EN STOCK                                   */}
      {/* ========================================================================= */}
      {stockModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-emerald-400" />
                    <span>{stockModalMode === "CREATE" ? "Cargar Repuesto a Stock" : "Editar Repuesto en Stock"}</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    {stockModalMode === "CREATE"
                      ? "Registra una nueva pieza en el catálogo e inventario físico del taller."
                      : "Modifica existencias y precios del repuesto."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStockModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveStockItem} className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Descripción / Nombre del Repuesto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={stockForm.nombre}
                    onChange={(e) => setStockForm({ ...stockForm, nombre: e.target.value })}
                    placeholder="Ej: Juego de Pastillas Delanteras Bosch, Filtro de Aceite Mann..."
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Código / Referencia de Pieza:
                    </label>
                    <input
                      type="text"
                      value={stockForm.codigo}
                      onChange={(e) => setStockForm({ ...stockForm, codigo: e.target.value })}
                      placeholder="Ej: BOS-PD1422"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Categoría:
                    </label>
                    <input
                      type="text"
                      value={stockForm.categoria}
                      onChange={(e) => setStockForm({ ...stockForm, categoria: e.target.value })}
                      placeholder="Ej: Frenos, Filtros, Fluidos, Motor..."
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cantidad en Stock:
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockForm.stock}
                    onChange={(e) => setStockForm({ ...stockForm, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Precio de Venta (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockForm.precioVenta}
                    onChange={(e) => setStockForm({ ...stockForm, precioVenta: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={stockSaving}
                    onClick={() => setStockModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={stockSaving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    {stockSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{stockModalMode === "CREATE" ? "Cargar al Inventario" : "Guardar Cambios"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* ========================================================================= */}
      {activePhotoUrl && (
        <ModalPortal>
          <div
            onClick={() => setActivePhotoUrl(null)}
            className="fixed inset-0 w-screen h-screen z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-in fade-in"
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
        </ModalPortal>
      )}
    </div>
  );
}
