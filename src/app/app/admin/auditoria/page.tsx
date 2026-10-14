"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Download,
  Eye,
  Clock,
  Calendar,
  FileCode,
  RefreshCw,
} from "lucide-react";

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

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [entidadFilter, setEntidadFilter] = useState("TODAS");
  const [accionFilter, setAccionFilter] = useState("TODAS");
  const [userFilter, setUserFilter] = useState("TODOS");
  const [rangoFecha, setRangoFecha] = useState("TODAS"); // "TODAS", "HOY", "7_DIAS", "ESTE_MES", "CUSTOM"
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
      `Auditoria_AutoTaller_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionFriendlyName = (accion: string, entidad: string) => {
    switch (accion) {
      case "CREATE":
        if (entidad.includes("WorkLog")) return "Nota Diaria de Reparación";
        if (entidad.includes("Order")) return "Creación de Orden";
        if (entidad.includes("Client")) return "Alta de Cliente";
        if (entidad.includes("Vehicle")) return "Alta de Vehículo";
        if (entidad.includes("Inventory")) return "Ingreso a Stock";
        if (entidad.includes("Part")) return "Carga de Repuesto";
        return "Creación / Alta";
      case "UPDATE":
        if (entidad.includes("Settings")) return "Cambio Configuración";
        if (entidad.includes("Inventory")) return "Ajuste de Stock / Inventario";
        return "Modificación / Ajuste";
      case "STATUS_CHANGE":
        return "Cambio de Estado";
      case "ASIGNACION_MECANICO":
        return "Asignación de Mecánico";
      case "PERITAJE_PROFUNDO":
        return "Peritaje Técnico de Ingreso";
      case "AVISO_CLIENTE":
        return "Aviso a Cliente (Listo)";
      case "FINALIZACION_REPARACION":
        return "Reparación Lista / Finalizada";
      case "ENTREGA_VEHICULO":
        return "Entrega y Archivo de Auto";
      case "SOFT_DELETE":
        if (entidad.includes("Client")) return "Eliminación de Cliente";
        if (entidad.includes("Vehicle")) return "Eliminación de Vehículo";
        return "Eliminación (Soft Delete)";
      case "DELETE":
        if (entidad.includes("Inventory")) return "Eliminación de Repuesto Stock";
        if (entidad.includes("Part")) return "Eliminación de Repuesto de Orden";
        return "Eliminación";
      case "LOGIN":
        return "Inicio de Sesión";
      case "LOGIN_FAILED":
        return "Intento Fallido de Acceso";
      case "LOGOUT":
        return "Cierre de Sesión";
      case "UPLOAD_MULTIMEDIA":
        return "Carga de Evidencia / Foto";
      case "DELETE_MULTIMEDIA":
        return "Eliminación de Evidencia / Foto";
      case "UPLOAD_FILE":
        return "Subida de Archivo";
      case "OCR_SCAN":
        return "Escaneo OCR de Comprobante";
      default:
        return accion;
    }
  };

  const getActionBadge = (accion: string) => {
    switch (accion) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "STATUS_CHANGE":
        return "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
      case "ASIGNACION_MECANICO":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PERITAJE_PROFUNDO":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "AVISO_CLIENTE":
      case "FINALIZACION_REPARACION":
      case "ENTREGA_VEHICULO":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
      case "SOFT_DELETE":
      case "DELETE":
      case "DELETE_MULTIMEDIA":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "LOGIN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "LOGIN_FAILED":
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      case "LOGOUT":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "UPLOAD_MULTIMEDIA":
      case "UPLOAD_FILE":
      case "OCR_SCAN":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
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
        return "Repuestos y Costos";
      case "Inventory":
        return "Inventario de Stock";
      case "WorkLogs":
        return "Horas y Bitácora";
      case "Multimedia":
        return "Peritaje y Fotos";
      case "TenantSettings":
        return "Configuración del Taller";
      case "Auth":
        return "Seguridad y Accesos";
      case "Storage":
        return "Archivos y Documentos";
      default:
        return entidad;
    }
  };

  const getChangeSummary = (log: AuditLogItem) => {
    const p = log.detallesParsed;
    if (!p) return log.detallesCambio || "Sin información detallada";

    if (p.motivo) return p.motivo;
    if (p.descripcion) return p.descripcion;

    if (p.campo && (p.anterior !== undefined || p.nuevo !== undefined)) {
      return `Modificado '${p.campo}': ${p.anterior ?? "—"} → ${p.nuevo ?? "—"}`;
    }

    if (p.anterior && p.nuevo && typeof p.nuevo === "object") {
      const keysChanged = Object.keys(p.nuevo).filter(
        (k) => JSON.stringify(p.nuevo[k]) !== JSON.stringify(p.anterior[k])
      );
      if (keysChanged.length > 0) {
        return `Campos actualizados: ${keysChanged.slice(0, 3).join(", ")}${
          keysChanged.length > 3 ? "..." : ""
        }`;
      }
    }

    if (p.patente) return `Vehículo patente ${p.patente}`;
    if (p.monto) return `Monto: $${Number(p.monto).toLocaleString("es-AR")}`;
    if (p.numeroOrden) return `Orden #${p.numeroOrden}`;

    return typeof p === "string" ? p : JSON.stringify(p).slice(0, 80);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Módulo de Auditoría
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Historial y Auditoría
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro cronológico inalterable de cada alta, modificación sensible, baja lógica y acceso al sistema.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS RÁPIDOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Fila 1: Filtros rápidos por fecha */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Filtro por Fecha:</span>
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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

          {/* Si eligió rango personalizado, inputs de fecha */}
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
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {/* Fila 2: Filtros por Usuario, Módulo, Acción y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Búsqueda de texto */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, email o cambio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Filtro Rápido por Usuario */}
          <div className="sm:col-span-3">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="TODAS">Todos los Módulos</option>
              <option value="WorkOrders">Órdenes de Trabajo</option>
              <option value="Clients">Clientes</option>
              <option value="Vehicles">Vehículos</option>
              <option value="Parts">Repuestos y Costos</option>
              <option value="Inventory">Inventario de Stock</option>
              <option value="WorkLogs">Horas y Bitácora</option>
              <option value="TenantSettings">Configuración</option>
              <option value="Multimedia">Multimedia / Peritaje</option>
              <option value="Storage">Archivos / Storage</option>
              <option value="Auth">Autenticación / Seguridad</option>
            </select>
          </div>

          {/* Filtro por Acción */}
          <div className="sm:col-span-2">
            <select
              value={accionFilter}
              onChange={(e) => setAccionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="TODAS">Todas las Acciones</option>
              <option value="CREATE">CREATE (Alta)</option>
              <option value="UPDATE">UPDATE (Edición)</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE (Cambio de Estado)</option>
              <option value="ASIGNACION_MECANICO">ASIGNACIÓN MECÁNICO</option>
              <option value="PERITAJE_PROFUNDO">PERITAJE TÉCNICO</option>
              <option value="FINALIZACION_REPARACION">FINALIZACIÓN DE REPARACIÓN</option>
              <option value="ENTREGA_VEHICULO">ENTREGA DE VEHÍCULO</option>
              <option value="AVISO_CLIENTE">AVISO AL CLIENTE</option>
              <option value="SOFT_DELETE">ELIMINAR (Soft Delete)</option>
              <option value="DELETE">DELETE (Borrado físico)</option>
              <option value="UPLOAD_MULTIMEDIA">MULTIMEDIA (Evidencia)</option>
              <option value="OCR_SCAN">OCR (Escaneo de remitos)</option>
              <option value="LOGIN">LOGIN (Inicio de Sesión)</option>
              <option value="LOGIN_FAILED">LOGIN FALLIDO</option>
              <option value="LOGOUT">LOGOUT (Cierre de Sesión)</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              onClick={fetchLogs}
              className="w-full h-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE AUDITORÍA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Registros Encontrados:
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-extrabold">
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
              className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold"
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
          <div className="p-16 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Sin eventos de auditoría</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No se encontraron registros que coincidan con los criterios de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Usuario Responsable</th>
                  <th className="py-3 px-4">Acción Realizada</th>
                  <th className="py-3 px-4">Módulo Afectado</th>
                  <th className="py-3 px-4">Detalle del Cambio</th>
                  <th className="py-3 px-4 text-right">Inspección</th>
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
                    second: "2-digit",
                  });

                  const friendlyAction = getActionFriendlyName(
                    log.accion,
                    log.entidadAfectada || log.entidad || ""
                  );
                  const friendlyModule = getModuleFriendlyName(
                    log.entidadAfectada || log.entidad || ""
                  );
                  const summary = getChangeSummary(log);

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

                      {/* 2. Usuario que realizó la acción */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
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

                      {/* 4. Módulo afectado */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {friendlyModule}
                      </td>

                      {/* 5. Detalle del cambio (qué se modificó) */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                        <span className="line-clamp-2 leading-relaxed text-[11px]">
                          {summary}
                        </span>
                      </td>

                      {/* 6. Inspección / Ver Diff */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg border border-sky-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Diff</span>
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

      {/* MODAL DETALLE DE CAMBIOS (JSON DIFF ANTERIOR VS NUEVO) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Auditoría Inalterable: {getActionFriendlyName(selectedLog.accion, selectedLog.entidadAfectada)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID Registro: <span className="font-mono">{selectedLog.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">Usuario responsable</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedLog.userName || "Sistema"}
                  </span>
                  <span className="block text-slate-500 text-[11px]">
                    {selectedLog.userEmail || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Fecha y Entidad</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {getModuleFriendlyName(selectedLog.entidadAfectada)}
                  </span>
                  <span className="block text-slate-500 text-[11px]">
                    {new Date(selectedLog.timestamp).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              {/* Comparador de valores Anterior vs Nuevo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Valor Anterior */}
                <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80">
                  <span className="font-bold text-rose-800 text-[11px] uppercase tracking-wider block mb-2">
                    ◀ Estado Anterior
                  </span>
                  <pre className="bg-slate-900 text-rose-300 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {selectedLog.detallesParsed?.anterior
                      ? JSON.stringify(selectedLog.detallesParsed.anterior, null, 2)
                      : "// Sin estado previo registrado"}
                  </pre>
                </div>

                {/* Valor Nuevo */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80">
                  <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider block mb-2">
                    ▶ Nuevo Estado / Acción
                  </span>
                  <pre className="bg-slate-900 text-emerald-300 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {selectedLog.detallesParsed?.nuevo
                      ? JSON.stringify(selectedLog.detallesParsed.nuevo, null, 2)
                      : JSON.stringify(selectedLog.detallesParsed, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                IP: {selectedLog.ipAddress || "Interna"}
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
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
