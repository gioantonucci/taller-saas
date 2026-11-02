"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Package,
  CheckCircle2,
  Calendar,
  Truck,
  ArrowRight,
  X,
  Send,
  Loader2,
  BellRing,
} from "lucide-react";
import { UserSession } from "@/types";
import { normalizeRole } from "@/lib/auth";
import { SPARE_PARTS_CONFIG, formatTiempoTranscurrido } from "@/lib/spare-parts-config";

interface SparePartReminderGlobalProps {
  user: UserSession;
}

export default function SparePartReminderGlobal({ user }: SparePartReminderGlobalProps) {
  const role = normalizeRole(user.role);

  const [reminderData, setReminderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Estados del modal periódico de Recepción ("¿Ya encargaste los repuestos...?")
  const [showPeriodicModal, setShowPeriodicModal] = useState(false);
  const [modalType, setModalType] = useState<"ENCARGO" | "LLEGADA">("ENCARGO");

  // Estado para el formulario inline de "Encargo realizado"
  const [activeEncargoId, setActiveEncargoId] = useState<string | null>(null);
  const [proveedor, setProveedor] = useState("");
  const [fechaEstimadaLlegada, setFechaEstimadaLlegada] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Estado para el formulario inline de "Recibido"
  const [activeRecibidoId, setActiveRecibidoId] = useState<string | null>(null);
  const [remitoNro, setRemitoNro] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");

  // Control de intervalos de preguntas periódicas (30 min por defecto)
  const lastPromptTimeRef = useRef<number>(0);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/spare-parts/reminders", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setReminderData(data);

      // Evaluar si corresponde disparar la pregunta periódica a Recepción
      if (role === "RECEPTION" || role === "ADMIN") {
        const now = Date.now();
        const intervalMs =
          (data.config?.recordatorioIntervaloMinutos || SPARE_PARTS_CONFIG.RECORDATORIO_INTERVALO_MINUTOS) *
          60 *
          1000;

        const hasParaEncargar = (data.reception?.paraEncargarCount || 0) > 0;
        const hasLlegadaVencida = (data.reception?.llegadaVencidaCount || 0) > 0;

        // Se muestra al iniciar sesión (primer mount) y luego cada 30 min mientras haya pendientes
        if (hasParaEncargar || hasLlegadaVencida) {
          if (lastPromptTimeRef.current === 0 || now - lastPromptTimeRef.current >= intervalMs) {
            if (hasParaEncargar) {
              setModalType("ENCARGO");
              setShowPeriodicModal(true);
              lastPromptTimeRef.current = now;
            } else if (hasLlegadaVencida) {
              setModalType("LLEGADA");
              setShowPeriodicModal(true);
              lastPromptTimeRef.current = now;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Aviso al consultar recordatorios de repuestos:", err);
    }
  }, [role]);

  // Polling cada 60 segundos
  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, SPARE_PARTS_CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  // Manejador "Todavía no" (pospone modal 30 min y registra en auditoría)
  const handleTodaviaNo = async (pedidoId: string, tipo: "ENCARGO" | "LLEGADA") => {
    setSubmittingAction(true);
    try {
      await fetch(`/api/spare-parts/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TODAVIA_NO",
          tipo,
        }),
      });
      // Pospone el modal para la próxima vuelta (30 min)
      lastPromptTimeRef.current = Date.now();
      setShowPeriodicModal(false);
      setActiveEncargoId(null);
      setActiveRecibidoId(null);
      fetchReminders();
    } catch (err) {
      console.error("Error al posponer recordatorio:", err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Manejador "Encargo realizado"
  const handleConfirmEncargo = async (pedidoId: string) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/spare-parts/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENCARGO_REALIZADO",
          proveedor: proveedor.trim() || undefined,
          fechaEstimadaLlegada: fechaEstimadaLlegada || undefined,
        }),
      });
      if (res.ok) {
        setActiveEncargoId(null);
        setProveedor("");
        setFechaEstimadaLlegada("");
        // Si ya no quedan pedidos pendientes, cerrar el modal
        const remaining = (reminderData?.reception?.paraEncargarList || []).filter(
          (p: any) => p.id !== pedidoId
        );
        if (remaining.length === 0) {
          setShowPeriodicModal(false);
        }
        fetchReminders();
      }
    } catch (err) {
      console.error("Error al marcar encargo realizado:", err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Manejador "Recibido"
  const handleConfirmRecibido = async (pedidoId: string) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/spare-parts/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECIBIDO",
          remitoNro: remitoNro.trim() || undefined,
          notasRecepcion: notasRecepcion.trim() || undefined,
        }),
      });
      if (res.ok) {
        setActiveRecibidoId(null);
        setRemitoNro("");
        setNotasRecepcion("");
        const remaining = (reminderData?.reception?.llegadaVencidaList || []).filter(
          (p: any) => p.id !== pedidoId
        );
        if (remaining.length === 0) {
          setShowPeriodicModal(false);
        }
        fetchReminders();
      }
    } catch (err) {
      console.error("Error al confirmar recepción:", err);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!reminderData) return null;

  const { reception, admin, mechanic } = reminderData;
  const isReception = role === "RECEPTION";
  const isAdmin = role === "ADMIN";
  const isMechanic = role === "MECHANIC";

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. BANNER FIJO NO CERRABLE PARA RECEPCIÓN                                */}
      {/* Regla: Aparece en todas las pantallas sin posibilidad de cerrarlo          */}
      {/* mientras haya pedidos en "Para encargar" o con llegada vencida            */}
      {/* ========================================================================= */}
      {isReception && reception?.hasPendingTasks && (
        <div className="mb-4 bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 text-white rounded-2xl p-4 shadow-lg shadow-amber-500/20 border border-amber-400/40 animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
                <Package className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm uppercase tracking-wide bg-white/25 px-2 py-0.5 rounded-md text-white text-[11px]">
                    Recepción • Recordatorio Activo
                  </span>
                  {reception.oldestParaEncargar?.isEscalated && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-200 text-[11px] font-black uppercase tracking-wider animate-pulse border border-rose-400/40">
                      🚨 Escalado ({">"} {SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS}h)
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-amber-50 mt-1 leading-snug">
                  {reception.paraEncargarCount > 0 ? (
                    <>
                      Hay <strong className="font-black text-white">{reception.paraEncargarCount}</strong>{" "}
                      pedido{reception.paraEncargarCount > 1 ? "s" : ""} de repuestos esperando que se
                      haga el encargo.
                      {reception.oldestParaEncargar && (
                        <span className="block sm:inline sm:ml-1 text-white font-semibold">
                          Más antiguo: <strong>Orden #{reception.oldestParaEncargar.numeroOrden}</strong> (
                          {reception.oldestParaEncargar.patente}) pendiente hace{" "}
                          <strong>{reception.oldestParaEncargar.elapsedFormatted}</strong>.
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Hay <strong className="font-black text-white">{reception.llegadaVencidaCount}</strong>{" "}
                      pedido{reception.llegadaVencidaCount > 1 ? "s" : ""} con fecha estimada de llegada
                      vencida pendientes de recepción.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalType(reception.paraEncargarCount > 0 ? "ENCARGO" : "LLEGADA");
                  setShowPeriodicModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white text-amber-900 font-extrabold text-xs shadow-md hover:bg-amber-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Revisar Ahora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <Link
                href="/app/repuestos"
                className="px-3.5 py-2 rounded-xl bg-amber-950/40 text-white font-bold text-xs hover:bg-amber-950/60 transition-all border border-white/20"
              >
                Ir a Repuestos
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AVISO PARA EL ADMINISTRADOR (Escalamiento > 4h o Pedidos por revisar)  */}
      {/* ========================================================================= */}
      {isAdmin && admin && (admin.escalatedCount > 0 || admin.solicitadosCount > 0) && (
        <div className="mb-4 space-y-2">
          {admin.escalatedCount > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-600 text-white">
                      Alerta de Escalamiento
                    </span>
                    <span className="text-xs font-bold text-rose-800">
                      {admin.escalatedCount} pedido{admin.escalatedCount > 1 ? "s" : ""} sin encargar
                      hace más de {SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS} horas
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 mt-1">
                    Recepción no ha realizado los encargos correspondientes dentro del plazo límite.
                  </p>
                </div>
              </div>
              <Link
                href="/app/repuestos?estado=PARA_ENCARGAR"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 transition-all self-end sm:self-auto"
              >
                <span>Ver Pedidos Escalados</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {admin.solicitadosCount > 0 && admin.escalatedCount === 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-4 h-4 text-purple-700 shrink-0" />
                <span className="text-xs font-bold text-purple-900">
                  Hay {admin.solicitadosCount} pedido{admin.solicitadosCount > 1 ? "s" : ""} de
                  repuestos pendientes de tu revisión y aprobación.
                </span>
              </div>
              <Link
                href="/app/repuestos?estado=SOLICITADO"
                className="text-xs font-extrabold text-purple-700 hover:text-purple-900 underline shrink-0"
              >
                Revisar
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AVISO PARA MECÁNICO (Devuelto o Recibido)                               */}
      {/* ========================================================================= */}
      {isMechanic && mechanic?.notices && mechanic.notices.length > 0 && (
        <div className="mb-4 space-y-2">
          {mechanic.notices.map((notice: any) => (
            <div
              key={notice.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                notice.estado === "RECIBIDO"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-rose-50 border-rose-300 text-rose-950"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {notice.estado === "RECIBIDO" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-black">
                    {notice.estado === "RECIBIDO"
                      ? `¡Repuestos recibidos en taller para Orden #${notice.numeroOrden} (${notice.patente})!`
                      : `Pedido de repuestos devuelto por el Administrador para Orden #${notice.numeroOrden} (${notice.patente})`}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {notice.estado === "RECIBIDO"
                      ? "Ya puedes reanudar la reparación técnica en tu Hoja de Trabajo."
                      : `Motivo de devolución: "${notice.motivoDevolucion || "Revisar ítems solicitados"}"`}
                  </p>
                </div>
              </div>
              <Link
                href={`/app/ordenes/${notice.workOrderId}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                  notice.estado === "RECIBIDO"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-rose-600 text-white hover:bg-rose-700"
                }`}
              >
                Ver Orden
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL PERIÓDICO DE RECEPCIÓN ("¿Ya encargaste los repuestos...?")       */}
      {/* Aparece al iniciar sesión y cada 30 min (configurable)                    */}
      {/* ========================================================================= */}
      {showPeriodicModal && (isReception || isAdmin) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {modalType === "ENCARGO"
                      ? "¿Ya encargaste los repuestos?"
                      : "¿Llegaron los repuestos al taller?"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {modalType === "ENCARGO"
                      ? "Control de seguimiento obligatorio para Recepción"
                      : "Control de llegada de repuestos encargados"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPeriodicModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Cerrar ventana temporal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido / Lista de pedidos pendientes */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600">
                {modalType === "ENCARGO"
                  ? "Los siguientes pedidos fueron aprobados por el Administrador y están esperando que realices el encargo con el proveedor:"
                  : "Los siguientes pedidos tenían fecha estimada de llegada hoy o anterior:"}
              </p>

              {modalType === "ENCARGO" &&
                reception?.paraEncargarList?.map((pedido: any) => {
                  const isExpanded = activeEncargoId === pedido.id;
                  return (
                    <div
                      key={pedido.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        pedido.isEscalated
                          ? "border-rose-400 bg-rose-50/50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900">
                              Orden #{pedido.numeroOrden}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-mono text-[11px] font-black rounded-md">
                              {pedido.patente}
                            </span>
                            {pedido.isEscalated && (
                              <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded uppercase animate-pulse">
                                Escalado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            <strong className="text-slate-800">Falla:</strong> {pedido.fallaReparar}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                            <span className="flex items-center gap-1 font-semibold text-amber-800">
                              <Clock className="w-3 h-3" />
                              Esperando hace {pedido.elapsedFormatted}
                            </span>
                            <span>•</span>
                            <span>{pedido.itemsCount} repuesto(s)</span>
                          </div>
                        </div>

                        {!isExpanded && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveEncargoId(pedido.id);
                                setProveedor("");
                                setFechaEstimadaLlegada("");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all"
                            >
                              Encargo realizado
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => handleTodaviaNo(pedido.id, "ENCARGO")}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all"
                            >
                              Todavía no
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Formulario corto para "Encargo realizado" */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-3 bg-white p-3 rounded-xl">
                          <p className="text-xs font-extrabold text-slate-800">
                            Datos del encargo (opcionales):
                          </p>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Proveedor / Distribuidor
                            </label>
                            <input
                              type="text"
                              value={proveedor}
                              onChange={(e) => setProveedor(e.target.value)}
                              placeholder="Ej: Distribuidora Norte, Repuestos Valencia..."
                              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Fecha estimada de llegada
                            </label>
                            <input
                              type="date"
                              value={fechaEstimadaLlegada}
                              onChange={(e) => setFechaEstimadaLlegada(e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveEncargoId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              Volver
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => handleConfirmEncargo(pedido.id)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
                            >
                              {submittingAction && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Confirmar Encargo</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {modalType === "LLEGADA" &&
                reception?.llegadaVencidaList?.map((pedido: any) => {
                  const isExpanded = activeRecibidoId === pedido.id;
                  return (
                    <div key={pedido.id} className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">
                              Orden #{pedido.numeroOrden}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-mono text-[11px] font-black rounded-md">
                              {pedido.patente}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Proveedor: <strong>{pedido.proveedor || "No indicado"}</strong>
                          </p>
                          <p className="text-[11px] font-bold text-rose-700 mt-1">
                            Llegada prevista: {new Date(pedido.fechaEstimadaLlegada).toLocaleDateString()}
                          </p>
                        </div>

                        {!isExpanded && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRecibidoId(pedido.id);
                                setRemitoNro("");
                                setNotasRecepcion("");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs"
                            >
                              Marcar Recibido
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => handleTodaviaNo(pedido.id, "LLEGADA")}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                            >
                              Todavía no
                            </button>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-slate-200 space-y-3 bg-white p-3 rounded-xl">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Nº Remito / Factura (Opcional)
                            </label>
                            <input
                              type="text"
                              value={remitoNro}
                              onChange={(e) => setRemitoNro(e.target.value)}
                              placeholder="Ej: REM-00984"
                              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Notas de Recepción
                            </label>
                            <input
                              type="text"
                              value={notasRecepcion}
                              onChange={(e) => setNotasRecepcion(e.target.value)}
                              placeholder="Paquete verificado completo..."
                              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveRecibidoId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600"
                            >
                              Volver
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => handleConfirmRecibido(pedido.id)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs"
                            >
                              {submittingAction && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Confirmar Recepción</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>El recordatorio se pospone por 30 minutos al pulsar "Todavía no".</span>
              <Link
                href="/app/repuestos"
                onClick={() => setShowPeriodicModal(false)}
                className="font-bold text-amber-600 hover:text-amber-800 underline"
              >
                Abrir módulo Repuestos
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
