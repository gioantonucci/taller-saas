"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Download,
  Eye,
  Clock,
  Calendar,
  RefreshCw,
  Trash2,
  User,
  ArrowRight,
  Shield,
  Wrench,
  Car,
  Users,
  Package,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileCode,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useAppDialog } from "@/components/AppDialog";

interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  accion: string;
  entidad: string | null;
  entidadAfectada: string;
  entidadId: string | null;
  detallesCambio: string;
  detallesParsed: any;
  ipAddress: string | null;
  timestamp: string;
}

interface UserItem {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  role: string;
}

// Diccionario de nombres legibles para campos de la base de datos
const FIELD_LABELS: Record<string, string> = {
  estado: "Estado de la orden",
  diagnostico: "Diagnóstico inicial",
  trabajoARealizar: "Trabajo a realizar",
  observaciones: "Observaciones",
  presupuestoEstimado: "Presupuesto estimado",
  montoTotal: "Total facturado",
  costoTotal: "Costo de repuestos",
  senia: "Seña / Anticipo",
  descuento: "Descuento aplicado",
  kilometraje: "Kilometraje",
  nivelCombustible: "Nivel de combustible",
  fechaPrometida: "Fecha prometida de entrega",
  fechaEntrega: "Fecha efectiva de entrega",
  mecanicoId: "Mecánico asignado",
  mecanicoAsignado: "Mecánico asignado",
  patente: "Matrícula / Patente",
  marca: "Marca",
  modelo: "Modelo",
  anio: "Año del vehículo",
  color: "Color",
  vin: "N° Bastidor (VIN)",
  motor: "N° de Motor",
  nombre: "Nombre",
  apellido: "Apellido",
  telefono: "Teléfono",
  email: "Correo electrónico",
  direccion: "Dirección",
  dni: "DNI",
  cuit: "CUIT / DNI",
  codigo: "Código de pieza",
  cantidad: "Cantidad",
  costoUnitario: "Costo unitario",
  precioVenta: "Precio al cliente",
  stockActual: "Stock disponible",
  stockMinimo: "Stock mínimo",
  ubicacion: "Ubicación en depósito",
  horas: "Horas computadas",
  descripcion: "Descripción",
  motivo: "Motivo del cambio",
  rol: "Rol asignado",
  activo: "Estado activo",
  esPresupuesto: "Modo presupuesto",
  notasInternas: "Notas internas",
  whatsapp: "WhatsApp del taller",
  horarios: "Horarios de atención",
  tallerNombre: "Nombre del taller",
  fileName: "Nombre de archivo",
  fileSize: "Tamaño de archivo",
};

// Diccionario de estados en lenguaje natural
const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de inicio",
  EN_PROCESO: "En reparación",
  ESPERANDO_REPUESTOS: "Esperando repuestos",
  TERMINADO: "Listo para retirar",
  REPARADO: "Listo para retirar",
  ENTREGADO: "Entregado al cliente",
  ARCHIVADO: "Archivado",
  CANCELADO: "Cancelado",
};

// Formateador amigable de valores
function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === "") return "— (Sin valor)";
  if (typeof val === "boolean") return val ? "Sí" : "No";

  const keyLower = key.toLowerCase();
  if (
    keyLower.includes("monto") ||
    keyLower.includes("presupuesto") ||
    keyLower.includes("costo") ||
    keyLower.includes("precio") ||
    keyLower.includes("senia") ||
    keyLower.includes("descuento")
  ) {
    const num = Number(val);
    if (!isNaN(num)) return `$${num.toLocaleString("es-AR")}`;
  }

  if (keyLower === "kilometraje") {
    const num = Number(val);
    if (!isNaN(num)) return `${num.toLocaleString("es-AR")} km`;
  }

  if (keyLower === "nivelcombustible") {
    return `${val}%`;
  }

  if (keyLower === "horas") {
    return `${val} hs`;
  }

  if (keyLower === "estado" && typeof val === "string") {
    return STATUS_LABELS[val] || val;
  }

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    try {
      const d = new Date(val);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {}
  }

  if (typeof val === "object") {
    try {
      return Object.entries(val)
        .map(([k, v]) => `${FIELD_LABELS[k] || k}: ${v}`)
        .join(", ");
    } catch {
      return JSON.stringify(val);
    }
  }

  return String(val);
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showJsonTech, setShowJsonTech] = useState(false);

  const { confirm, alert } = useAppDialog();

  // Filtros limpios y modernos
  const [entidadFilter, setEntidadFilter] = useState("TODAS");
  const [accionFilter, setAccionFilter] = useState("TODAS");
  const [userFilter, setUserFilter] = useState("TODOS");
  const [rangoFecha, setRangoFecha] = useState("TODAS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [search, setSearch] = useState("");

  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entidadFilter !== "TODAS") params.set("entidad", entidadFilter);
      if (accionFilter !== "TODAS") params.set("accion", accionFilter);
      if (userFilter !== "TODOS") params.set("userId", userFilter);
      if (rangoFecha !== "TODAS" && rangoFecha !== "CUSTOM") {
        params.set("rangoFecha", rangoFecha);
      } else if (rangoFecha === "CUSTOM") {
        if (fechaDesde) params.set("fechaDesde", fechaDesde);
        if (fechaHasta) params.set("fechaHasta", fechaHasta);
      }
      if (search) params.set("search", search);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error("Error al cargar auditoría:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entidadFilter, accionFilter, userFilter, rangoFecha]);

  // Acción para vaciar todo el historial
  const handleClearHistory = async () => {
    const ok = await confirm({
      title: "Vaciar Historial de Auditoría",
      message:
        "¿Confirmás que querés vaciar todos los registros del historial? Esta acción eliminará permanentemente los registros cronológicos acumulados.",
      confirmText: "Sí, vaciar historial",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!ok) return;

    setClearing(true);
    try {
      const res = await fetch("/api/audit-logs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        await alert({
          title: "Historial Vaciado",
          message:
            data.message ||
            "Se ha vaciado todo el registro de auditoría de forma correcta.",
          variant: "success",
        });
        setSelectedLog(null);
        fetchLogs();
      } else {
        await alert({
          title: "Error",
          message: data.error || "No se pudo vaciar el historial.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error("Error al vaciar historial:", err);
      await alert({
        title: "Error",
        message: "Ocurrió un error inesperado al vaciar el historial.",
        variant: "danger",
      });
    } finally {
      setClearing(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Fecha_Hora", "Usuario", "Email", "Accion", "Modulo", "Detalles"];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      `"${l.userName || ""}"`,
      l.userEmail || "",
      l.accion,
      l.entidadAfectada,
      `"${(l.detallesCambio || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Auditoria_Taller_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Nombres de acciones claros para el usuario
  const getActionFriendlyName = (accion: string, entidad: string) => {
    switch (accion) {
      case "CREATE":
        if (entidad.includes("WorkLog")) return "Nota en bitácora";
        if (entidad.includes("Order")) return "Apertura de orden";
        if (entidad.includes("Client")) return "Alta de cliente";
        if (entidad.includes("Vehicle")) return "Alta de vehículo";
        if (entidad.includes("Inventory")) return "Ingreso a stock";
        if (entidad.includes("Part")) return "Carga de repuesto";
        return "Nueva alta";
      case "UPDATE":
        if (entidad.includes("Settings")) return "Cambio en configuración";
        if (entidad.includes("Inventory")) return "Ajuste de inventario";
        return "Modificación de datos";
      case "STATUS_CHANGE":
        return "Cambio de estado";
      case "ASIGNACION_MECANICO":
        return "Asignación de mecánico";
      case "PERITAJE_PROFUNDO":
        return "Peritaje de ingreso";
      case "AVISO_CLIENTE":
        return "Aviso a cliente";
      case "FINALIZACION_REPARACION":
        return "Reparación lista";
      case "ENTREGA_VEHICULO":
        return "Vehículo entregado";
      case "SOFT_DELETE":
      case "DELETE":
        if (entidad.includes("Client")) return "Baja de cliente";
        if (entidad.includes("Vehicle")) return "Baja de vehículo";
        if (entidad.includes("Part")) return "Repuesto eliminado";
        if (entidad.includes("Inventory")) return "Pieza eliminada de stock";
        return "Eliminación / Baja";
      case "UPLOAD_MULTIMEDIA":
      case "UPLOAD_FILE":
        return "Foto / Evidencia adjunta";
      case "DELETE_MULTIMEDIA":
        return "Evidencia eliminada";
      case "LOGIN":
        return "Inicio de sesión";
      case "LOGOUT":
        return "Cierre de sesión";
      case "OCR_SCAN":
        return "Escaneo de remito OCR";
      default:
        return accion;
    }
  };

  // Badges con paleta suave y moderna
  const getActionBadge = (accion: string) => {
    switch (accion) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "STATUS_CHANGE":
        return "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
      case "ASIGNACION_MECANICO":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "PERITAJE_PROFUNDO":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "FINALIZACION_REPARACION":
      case "ENTREGA_VEHICULO":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
      case "AVISO_CLIENTE":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "SOFT_DELETE":
      case "DELETE":
      case "DELETE_MULTIMEDIA":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "UPLOAD_MULTIMEDIA":
      case "UPLOAD_FILE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "LOGIN":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "LOGOUT":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getModuleFriendlyName = (entidad: string) => {
    switch (entidad) {
      case "WorkOrders":
      case "WorkOrder":
        return "Órdenes de Trabajo";
      case "Clients":
      case "Client":
        return "Clientes";
      case "Vehicles":
      case "Vehicle":
        return "Vehículos";
      case "Parts":
      case "Part":
        return "Repuestos y Stock";
      case "Inventory":
        return "Inventario";
      case "WorkLogs":
      case "WorkLog":
        return "Bitácora Técnica";
      case "Multimedia":
      case "Storage":
        return "Fotos y Evidencias";
      case "TenantSettings":
      case "Settings":
        return "Configuración del Taller";
      case "Auth":
      case "Security":
        return "Seguridad y Accesos";
      default:
        return entidad;
    }
  };

  // Resumen centrado en el usuario
  const getUserFriendlySummary = (log: AuditLogItem) => {
    const p = log.detallesParsed;
    if (!p) return log.detallesCambio || "Sin información detallada";

    // Si tiene descripción humana directa
    if (p.descripcion && typeof p.descripcion === "string") {
      return p.descripcion;
    }

    // Inicio / Cierre de sesión
    if (log.accion === "LOGIN") {
      if (p.intentoFallidoEmail) {
        return `Intento fallido de acceso con el email: ${p.intentoFallidoEmail}`;
      }
      return `Inicio de sesión exitoso al panel de control (${p.email || log.userEmail || "Usuario"})`;
    }
    if (log.accion === "LOGOUT") {
      return "Cierre de sesión seguro en la plataforma";
    }

    // Cambio de estado
    if (log.accion === "STATUS_CHANGE" || log.accion === "FINALIZACION_REPARACION" || log.accion === "ENTREGA_VEHICULO") {
      const prev = STATUS_LABELS[p.anterior] || p.anterior;
      const next = STATUS_LABELS[p.nuevo] || p.nuevo;
      if (prev && next) {
        return `El estado pasó de "${prev}" a "${next}"${p.patente ? ` (Vehículo: ${p.patente})` : ""}`;
      }
      if (next) {
        return `Se actualizó el estado a "${next}"${p.patente ? ` (Vehículo: ${p.patente})` : ""}`;
      }
    }

    // Asignación de mecánico
    if (log.accion === "ASIGNACION_MECANICO") {
      return `Se asignó el mecánico responsable de la orden`;
    }

    // Peritaje
    if (log.accion === "PERITAJE_PROFUNDO") {
      return `Se completó la inspección y peritaje técnico de ingreso`;
    }

    // Modificaciones con campos anteriores y nuevos
    if (p.anterior && p.nuevo && typeof p.nuevo === "object" && typeof p.anterior === "object") {
      const keysChanged = Object.keys(p.nuevo).filter(
        (k) => JSON.stringify(p.nuevo[k]) !== JSON.stringify(p.anterior[k])
      );
      if (keysChanged.length > 0) {
        const friendlyFields = keysChanged
          .slice(0, 3)
          .map((k) => FIELD_LABELS[k] || k)
          .join(", ");
        return `Se modificó: ${friendlyFields}${keysChanged.length > 3 ? " y otros" : ""}`;
      }
    }

    // Cambio individual
    if (p.campo && (p.anterior !== undefined || p.nuevo !== undefined)) {
      const fieldName = FIELD_LABELS[p.campo] || p.campo;
      const prevVal = formatFieldValue(p.campo, p.anterior);
      const nextVal = formatFieldValue(p.campo, p.nuevo);
      return `Cambió ${fieldName}: de "${prevVal}" a "${nextVal}"`;
    }

    // Altas
    if (log.accion === "CREATE") {
      if (p.patente) return `Vehículo registrado con patente ${p.patente}`;
      if (p.numeroOrden) return `Apertura de orden de trabajo #${p.numeroOrden}`;
      if (p.nombre) return `Nuevo registro creado a nombre de ${p.nombre} ${p.apellido || ""}`;
      if (p.motivo) return p.motivo;
    }

    // Eliminaciones
    if (log.accion === "DELETE" || log.accion === "SOFT_DELETE") {
      return p.motivo || "Se archivó o dio de baja el registro";
    }

    // Multimedia
    if (p.fileName) {
      return `Archivo subido: ${p.fileName}`;
    }

    if (p.motivo) return p.motivo;

    return typeof p === "string" ? p : "Registro de actividad procesado";
  };

  // Obtener pares de diferencias para el modal
  const getDiffPairs = (log: AuditLogItem) => {
    const p = log.detallesParsed;
    if (!p) return [];

    if (p.anterior && p.nuevo && typeof p.anterior === "object" && typeof p.nuevo === "object") {
      const allKeys = Array.from(new Set([...Object.keys(p.anterior), ...Object.keys(p.nuevo)]));
      const diffs: { field: string; label: string; prev: any; next: any }[] = [];

      for (const k of allKeys) {
        // Ignorar campos técnicos de base de datos irrelevantes para el usuario
        if (["id", "createdAt", "updatedAt", "tenantId", "userId"].includes(k)) continue;

        if (JSON.stringify(p.anterior[k]) !== JSON.stringify(p.nuevo[k])) {
          diffs.push({
            field: k,
            label: FIELD_LABELS[k] || k,
            prev: p.anterior[k],
            next: p.nuevo[k],
          });
        }
      }
      return diffs;
    }

    if (p.campo) {
      return [
        {
          field: p.campo,
          label: FIELD_LABELS[p.campo] || p.campo,
          prev: p.anterior,
          next: p.nuevo,
        },
      ];
    }

    // Si solo hay datos nuevos (ej. Alta / Create)
    const targetObj = p.nuevo && typeof p.nuevo === "object" ? p.nuevo : typeof p === "object" ? p : null;
    if (targetObj) {
      const keys = Object.keys(targetObj).filter(
        (k) => !["id", "createdAt", "updatedAt", "tenantId", "userId", "detallesParsed"].includes(k)
      );
      return keys.slice(0, 8).map((k) => ({
        field: k,
        label: FIELD_LABELS[k] || k,
        prev: null,
        next: targetObj[k],
      }));
    }

    return [];
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-sm">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Control y Seguridad
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Historial y Auditoría
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro cronológico de movimientos, altas, modificaciones sensibles y estados del taller.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón Vaciar Historial */}
          <button
            onClick={handleClearHistory}
            disabled={clearing || logs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Vaciar todos los registros del historial"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{clearing ? "Vaciando..." : "Vaciar Historial"}</span>
          </button>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS LIMPIO Y SIN VALORES OBSOLETOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Fila 1: Filtros rápidos por fecha */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Período:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "TODAS", label: "Todo el Historial" },
                { id: "HOY", label: "Hoy" },
                { id: "7_DIAS", label: "Últimos 7 Días" },
                { id: "ESTE_MES", label: "Este Mes" },
                { id: "CUSTOM", label: "Personalizado" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setRangoFecha(btn.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    rangoFecha === btn.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango personalizado */}
          {rangoFecha === "CUSTOM" && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-400">hasta</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                onClick={fetchLogs}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {/* Fila 2: Filtros por Búsqueda, Usuario, Módulo y Acción */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Búsqueda de texto */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, patente, vehículo o cambio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Filtro por Usuario */}
          <div className="sm:col-span-3">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido || ""} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Módulo */}
          <div className="sm:col-span-2">
            <select
              value={entidadFilter}
              onChange={(e) => setEntidadFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todos los Módulos</option>
              <option value="WorkOrders">Órdenes de Trabajo</option>
              <option value="Clients">Clientes</option>
              <option value="Vehicles">Vehículos</option>
              <option value="Parts">Repuestos y Stock</option>
              <option value="WorkLogs">Bitácora Técnica</option>
              <option value="Multimedia">Fotos y Evidencias</option>
              <option value="TenantSettings">Configuración del Taller</option>
              <option value="Auth">Seguridad y Accesos</option>
            </select>
          </div>

          {/* Filtro por Tipo de Acción */}
          <div className="sm:col-span-2">
            <select
              value={accionFilter}
              onChange={(e) => setAccionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas las Acciones</option>
              <option value="CREATE">Altas y Nuevos Registros</option>
              <option value="UPDATE">Modificaciones de Datos</option>
              <option value="STATUS_CHANGE">Cambios de Estado</option>
              <option value="ASIGNACION_MECANICO">Asignación de Mecánicos</option>
              <option value="PERITAJE_PROFUNDO">Peritaje Técnico de Ingreso</option>
              <option value="FINALIZACION_REPARACION">Reparación Finalizada</option>
              <option value="ENTREGA_VEHICULO">Entrega de Vehículo</option>
              <option value="AVISO_CLIENTE">Avisos al Cliente</option>
              <option value="DELETE">Eliminaciones y Bajas</option>
              <option value="MULTIMEDIA">Fotos y Evidencias</option>
              <option value="AUTH">Inicios y Cierres de Sesión</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              onClick={fetchLogs}
              className="w-full h-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* LISTADO PRINCIPAL DE MOVIMIENTOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Registros Encontrados:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-extrabold">
              {logs.length}
            </span>
          </div>

          {(userFilter !== "TODOS" ||
            entidadFilter !== "TODAS" ||
            accionFilter !== "TODAS" ||
            rangoFecha !== "TODAS" ||
            search) && (
            <button
              onClick={() => {
                setUserFilter("TODOS");
                setEntidadFilter("TODAS");
                setAccionFilter("TODAS");
                setRangoFecha("TODAS");
                setSearch("");
                setFechaDesde("");
                setFechaHasta("");
              }}
              className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-xs text-slate-500">Cargando registros de auditoría...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Sin movimientos registrados</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              El historial se encuentra actualmente limpio o no hay registros que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA MOBILE: Tarjetas Responsivas para Usuario */}
            <div className="md:hidden divide-y divide-slate-100">
              {logs.map((log) => {
                const date = new Date(log.timestamp);
                const formattedDate = date.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                const formattedTime = date.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const friendlyAction = getActionFriendlyName(
                  log.accion,
                  log.entidadAfectada || log.entidad || ""
                );
                const friendlyModule = getModuleFriendlyName(
                  log.entidadAfectada || log.entidad || ""
                );
                const summary = getUserFriendlySummary(log);

                return (
                  <div key={log.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formattedTime}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({formattedDate})</span>
                      </div>

                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getActionBadge(
                          log.accion
                        )}`}
                      >
                        {friendlyAction}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200">
                          {log.userName ? log.userName[0].toUpperCase() : "S"}
                        </div>
                        <span className="font-bold text-slate-800 text-xs">
                          {log.userName || "Sistema Automático"}
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {friendlyModule}
                      </span>
                    </div>

                    {/* Resumen amigable */}
                    <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 font-medium leading-relaxed">
                      {summary}
                    </div>

                    <button
                      onClick={() => {
                        setShowJsonTech(false);
                        setSelectedLog(log);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-sky-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Detalle del Cambio</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* VISTA DESKTOP: Tabla Elegante y Centrada en el Usuario */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4">Acción Realizada</th>
                    <th className="py-3 px-4">Módulo</th>
                    <th className="py-3 px-4">Descripción del Cambio</th>
                    <th className="py-3 px-4 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => {
                    const date = new Date(log.timestamp);
                    const formattedDate = date.toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });
                    const formattedTime = date.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const friendlyAction = getActionFriendlyName(
                      log.accion,
                      log.entidadAfectada || log.entidad || ""
                    );
                    const friendlyModule = getModuleFriendlyName(
                      log.entidadAfectada || log.entidad || ""
                    );
                    const summary = getUserFriendlySummary(log);

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Fecha / Hora */}
                        <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formattedTime}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {formattedDate}
                          </span>
                        </td>

                        {/* 2. Responsable */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] border border-slate-200">
                              {log.userName ? log.userName[0].toUpperCase() : "S"}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {log.userName || "Sistema Automático"}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {log.userEmail || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Acción */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                              log.accion
                            )}`}
                          >
                            {friendlyAction}
                          </span>
                        </td>

                        {/* 4. Módulo */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                            {friendlyModule}
                          </span>
                        </td>

                        {/* 5. Detalle legible */}
                        <td className="py-3.5 px-4 text-slate-700 max-w-md">
                          <span className="line-clamp-2 leading-relaxed text-xs font-medium">
                            {summary}
                          </span>
                        </td>

                        {/* 6. Botón de detalle amigable */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setShowJsonTech(false);
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalle</span>
                          </button>
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

      {/* MODAL DETALLE DE CAMBIOS — CENTRADO EN VISTA A USUARIO */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {getActionFriendlyName(selectedLog.accion, selectedLog.entidadAfectada)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Módulo: {getModuleFriendlyName(selectedLog.entidadAfectada)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ficha del responsable y fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-slate-700 font-black flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                  {selectedLog.userName ? selectedLog.userName[0].toUpperCase() : "S"}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Realizado por
                  </span>
                  <span className="font-bold text-slate-900 text-xs block">
                    {selectedLog.userName || "Sistema Automático"}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {selectedLog.userEmail || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-slate-600 font-black flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Fecha y Hora
                  </span>
                  <span className="font-bold text-slate-900 text-xs block">
                    {new Date(selectedLog.timestamp).toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono">
                    {new Date(selectedLog.timestamp).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}{" "}
                    hs
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen principal en lenguaje natural */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">
                Resumen del Movimiento
              </span>
              <p className="text-xs text-sky-950 font-medium leading-relaxed">
                {getUserFriendlySummary(selectedLog)}
              </p>
            </div>

            {/* TABLA VISUAL DE COMPARACIÓN (VALOR PREVIO VS NUEVO VALOR) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Datos Modificados en este Registro:
              </span>

              {(() => {
                const diffs = getDiffPairs(selectedLog);

                if (diffs.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No hay campos individuales contrastables. El evento corresponde a una acción directa de plataforma.
                    </div>
                  );
                }

                return (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                    {diffs.map((d, idx) => (
                      <div key={idx} className="p-3.5 text-xs grid grid-cols-1 sm:grid-cols-12 gap-2 items-center hover:bg-slate-50/50">
                        {/* Nombre del campo */}
                        <div className="sm:col-span-4 font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          <span>{d.label}</span>
                        </div>

                        {/* Valor anterior y nuevo */}
                        <div className="sm:col-span-8 flex items-center gap-2 flex-wrap">
                          {d.prev !== null && d.prev !== undefined && (
                            <>
                              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] line-through">
                                {formatFieldValue(d.field, d.prev)}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </>
                          )}
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            {formatFieldValue(d.field, d.next)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* SECCIÓN COLAPSABLE TÉCNICA (JSON PURO SOLO SI SE REQUIERE AUDITORÍA FORENSE) */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowJsonTech(!showJsonTech)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-slate-400" />
                  <span>Ver datos técnicos / JSON (Opcional)</span>
                </div>
                {showJsonTech ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showJsonTech && (
                <div className="mt-2 space-y-2 animate-in fade-in duration-150">
                  <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.detallesParsed, null, 2)}
                  </pre>
                  <p className="text-[10px] text-slate-400">
                    ID Interno: <span className="font-mono">{selectedLog.id}</span> · IP: {selectedLog.ipAddress || "Interna"}
                  </p>
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
