"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  X,
  AlertTriangle,
  Car,
  User,
  Wrench,
  Clock,
  FileCheck2,
} from "lucide-react";

export interface OkEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (updatedOrder: any) => void;
}

export default function OkEntregaModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: OkEntregaModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [nota, setNota] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNota("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  // Extraer controlCalidadSalida desde checklistDanio
  let controlCalidad: any = null;
  if (order.checklistDanio) {
    try {
      const parsed =
        typeof order.checklistDanio === "string"
          ? JSON.parse(order.checklistDanio)
          : order.checklistDanio;
      controlCalidad = parsed?.controlCalidadSalida || null;
    } catch {
      controlCalidad = null;
    }
  }

  const handleConfirmOk = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/work-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          okEncargadoEntrega: true,
          notaEncargado: nota.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo otorgar el OK de entrega");
      }

      onSuccess(data.order);
      onClose();
    } catch (err: any) {
      console.error("Error al dar OK de entrega:", err);
      setErrorMsg(err.message || "Error al conectar con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between relative">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Encargado de Taller • Visto Bueno</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <span>Dar OK para Entrega del Auto</span>
            </h2>
            <p className="text-xs text-emerald-100 font-medium leading-relaxed pt-0.5">
              Revisión técnica de salida y autorización para entrega al cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-2"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha Resumen de la Orden */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-extrabold text-slate-800">
              Orden #{order.numeroOrden}
            </span>
            <span className="text-slate-400 mx-1.5">•</span>
            <span className="font-semibold text-slate-700">
              {order.vehicle?.marca} {order.vehicle?.modelo}
            </span>
            {order.vehicle?.client?.nombre && (
              <span className="text-slate-500 block text-[11px]">
                Cliente: {order.vehicle.client.nombre} {order.vehicle.client.apellido || ""}
              </span>
            )}
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold text-xs tracking-wider shadow-xs">
            {order.vehicle?.patente}
          </span>
        </div>

        {/* Contenido / Encuesta realizada por el mecánico */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Solapa / Ficha de Respuestas del Mecánico */}
          <div className="rounded-2xl border-2 border-red-500 bg-red-50/40 overflow-hidden shadow-xs">
            <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-white" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Encuesta de Calidad Realizada por el Mecánico
                </span>
              </div>
              <span className="text-[10px] bg-red-800 text-white px-2 py-0.5 rounded-full font-bold">
                Solapa de Salida
              </span>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {controlCalidad ? (
                <>
                  {/* Pregunta 1 */}
                  <div className="bg-white p-3 rounded-xl border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
                    <span className="font-bold text-slate-800">
                      1. ¿Se realizó reset de servicio?
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] shrink-0 ${
                        controlCalidad.realizoResetServicio
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {controlCalidad.realizoResetServicio ? "✓ Sí, realizado" : "✗ No / No aplica"}
                    </span>
                  </div>

                  {/* Pregunta 2 */}
                  <div className="bg-white p-3 rounded-xl border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
                    <span className="font-bold text-slate-800">
                      2. ¿Se condujo en carretera?
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] shrink-0 ${
                        controlCalidad.condujoCarretera
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {controlCalidad.condujoCarretera ? "✓ Sí, se probó" : "✗ No se probó"}
                    </span>
                  </div>

                  {/* Pregunta 3 */}
                  <div className="bg-white p-3 rounded-xl border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
                    <span className="font-bold text-slate-800">
                      3. ¿Verificar si se solucionó el desperfecto?
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] shrink-0 ${
                        controlCalidad.desperfectoSolucionado
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {controlCalidad.desperfectoSolucionado
                        ? "✓ Sí, solucionado"
                        : "⚠ Con observaciones"}
                    </span>
                  </div>

                  {/* Pregunta 4 */}
                  <div className="bg-white p-3 rounded-xl border border-red-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-800">
                        4. ¿Apareció algún desperfecto no marcado tras la prueba?
                      </span>
                      <span
                        className={`px-3 py-1 rounded-lg font-extrabold text-[11px] shrink-0 ${
                          controlCalidad.desperfectoNuevoDetectado
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {controlCalidad.desperfectoNuevoDetectado
                          ? "⚠ Sí, nuevo desperfecto"
                          : "✓ No, ninguno"}
                      </span>
                    </div>

                    {controlCalidad.desperfectoNuevoDetectado && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 font-medium text-xs">
                        <strong className="block text-rose-900 mb-0.5">Detalle reportado:</strong>
                        {controlCalidad.detalleNuevoDesperfecto || "Sin detalle especificado"}
                      </div>
                    )}
                  </div>

                  {/* Metadatos del Mecánico */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
                    <span>
                      Técnico:{" "}
                      <strong>
                        {controlCalidad.mecanicoNombre ||
                          order.mechanic?.nombre ||
                          "Mecánico asignado"}
                      </strong>
                    </span>
                    {controlCalidad.fechaEncuesta && (
                      <span>
                        Fecha:{" "}
                        <strong>
                          {new Date(controlCalidad.fechaEncuesta).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-red-200 text-slate-600 text-center">
                  Esta orden fue cerrada previamente sin registrar la encuesta de salida.
                </div>
              )}
            </div>
          </div>

          {/* Nota opcional del Encargado de Taller */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Observación o Nota del Encargado de Taller (Opcional):
            </label>
            <textarea
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Revisión visual conforme, vehículo limpio y listo para el cliente..."
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
            />
          </div>

          {/* Banner de confirmación */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold block">Habilitar entrega al cliente</span>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Al otorgar el OK, la orden quedará formalmente autorizada para que Recepción pueda
                efectuar la entrega física del auto al cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmOk}
            disabled={submitting}
            className="w-full sm:flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-center"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Registrando Aprobación...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Aprobar y Dar OK de Entrega</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
