"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface FinalizarReparacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    numeroOrden: number;
    estado: string;
    mechanicId?: string | null;
    mechanic?: any;
    checklistDanio?: any;
    vehicle: {
      patente: string;
      marca: string;
      modelo: string;
      client?: {
        nombre: string;
        apellido?: string | null;
      };
    };
  } | null;
  onSuccess: (updatedOrder: any) => void;
}

const QUICK_HOURS = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0];

const QUICK_TAGS = [
  "Prueba de ruta satisfactoria",
  "Reparación y calibración final OK",
  "Control de niveles y fluidos completado",
  "Vehículo listo para entrega al cliente",
  "Sin códigos de falla detectados",
  "Limpieza general del área de trabajo",
];

export default function FinalizarReparacionModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: FinalizarReparacionModalProps) {
  const [horas, setHoras] = useState<string>("1.0");
  const [nota, setNota] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Solapa en rojo: Recordatorios y Control de Calidad de Salida
  const [resetServicio, setResetServicio] = useState<boolean | null>(null);
  const [condujoCarretera, setCondujoCarretera] = useState<boolean | null>(null);
  const [desperfectoSolucionado, setDesperfectoSolucionado] = useState<boolean | null>(null);
  const [desperfectoNuevo, setDesperfectoNuevo] = useState<boolean | null>(null);
  const [detalleNuevoDesperfecto, setDetalleNuevoDesperfecto] = useState<string>("");

  if (!isOpen || !order) return null;

  const hasMechanic = Boolean(order.mechanicId || order.mechanic);
  const hasPeritaje = Boolean(
    order.checklistDanio &&
    (() => {
      try {
        const p = typeof order.checklistDanio === "string" ? JSON.parse(order.checklistDanio) : order.checklistDanio;
        return Boolean(
          p &&
            (p.fechaHoraPeritaje ||
              p.fechaHoraCheckin ||
              p.estadoPeritaje === "COMPLETADO" ||
              (p.damagePins && p.damagePins.length > 0) ||
              (p.daniosCarroceria && p.daniosCarroceria.length > 0) ||
              p.rayones)
        );
      } catch {
        return false;
      }
    })()
  );

  const canFinalize = hasMechanic && hasPeritaje;

  const handleAddHours = (val: number) => {
    const current = parseFloat(horas) || 0;
    const next = (current + val).toFixed(2);
    // Remover decimales innecesarios (ej 2.00 -> 2, 2.50 -> 2.5)
    setHoras(parseFloat(next).toString());
  };

  const handleSetTag = (tag: string) => {
    if (!nota.trim()) {
      setNota(tag);
    } else if (!nota.includes(tag)) {
      setNota(`${nota.trim()}. ${tag}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validación de la encuesta obligatoria de control de salida
    if (
      resetServicio === null ||
      condujoCarretera === null ||
      desperfectoSolucionado === null ||
      desperfectoNuevo === null
    ) {
      setErrorMsg(
        "Debés responder los 4 recordatorios obligatorios de la solapa roja de Control de Calidad antes de enviar."
      );
      return;
    }

    if (desperfectoNuevo === true && !detalleNuevoDesperfecto.trim()) {
      setErrorMsg(
        "Por favor, detallá el nuevo desperfecto que apareció durante la prueba en carretera."
      );
      return;
    }

    const parsedHours = parseFloat(horas);
    if (isNaN(parsedHours) || parsedHours < 0) {
      setErrorMsg("Por favor, ingresá una cantidad de horas válida (mayor o igual a 0).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/work-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "FINALIZADO",
          finalWorkLog: {
            horasInvertidas: parsedHours,
            descripcionTarea:
              nota.trim() ||
              "Reparación completada y encuesta de control de calidad realizada.",
          },
          controlCalidadSalida: {
            realizoResetServicio: resetServicio,
            condujoCarretera: condujoCarretera,
            desperfectoSolucionado: desperfectoSolucionado,
            desperfectoNuevoDetectado: desperfectoNuevo,
            detalleNuevoDesperfecto: detalleNuevoDesperfecto.trim(),
            fechaEncuesta: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo finalizar la reparación");
      }

      onSuccess(data.order);
      onClose();
    } catch (err: any) {
      console.error("Error al finalizar orden:", err);
      setErrorMsg(err.message || "Error de conexión al cerrar la reparación");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 pb-5 sm:pb-6 flex items-start justify-between relative">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1 backdrop-blur-xs">
              <Lock className="w-3 h-3" />
              <span>Cierre Definitivo de Orden</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              <span>Finalizar Reparación</span>
            </h2>
            <p className="text-xs text-emerald-100 font-medium leading-relaxed pt-0.5">
              Registrá el reporte final y las horas trabajadas para cerrar la ficha.
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

        {/* Ficha Resumen del Vehículo y Orden */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-extrabold text-slate-800">
              Orden #{order.numeroOrden}
            </span>
            <span className="text-slate-400 mx-1.5">•</span>
            <span className="font-semibold text-slate-700">
              {order.vehicle.marca} {order.vehicle.modelo}
            </span>
            {order.vehicle.client?.nombre && (
              <span className="text-slate-500 block text-[11px]">
                Cliente: {order.vehicle.client.nombre} {order.vehicle.client.apellido || ""}
              </span>
            )}
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold text-xs tracking-wider shadow-xs">
            {order.vehicle.patente}
          </span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          {/* SOLAPA EN ROJO: RECORDATORIOS DE CONTROL DE CALIDAD Y PRUEBA */}
          <div className="rounded-2xl border-2 border-red-500 bg-red-50/40 overflow-hidden shadow-sm">
            {/* Cabecera / Solapa en rojo */}
            <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider">
                  Recordatorios Obligatorios de Salida
                </span>
              </div>
              <span className="text-[10px] bg-red-800 text-red-100 font-extrabold px-2.5 py-0.5 rounded-full border border-red-400">
                Control de Calidad
              </span>
            </div>

            <div className="p-3.5 sm:p-4 space-y-3.5">
              <div className="bg-red-100/80 border border-red-200/90 p-2.5 rounded-xl text-red-950 text-[11px] font-medium leading-relaxed">
                ⚠️ <strong>Atención mecánico:</strong> Respondé los siguientes 4 puntos antes de concluir la orden. Una vez enviada la encuesta, el <strong>Encargado de Taller</strong> deberá verificar estos puntos para dar el <strong>OK de entrega</strong> del auto.
              </div>

              {/* Pregunta 1 */}
              <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-2">
                <span className="font-extrabold text-slate-900 block text-xs">
                  1. ¿Se realizó reset de servicio?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetServicio(true)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      resetServicio === true
                        ? "bg-red-600 text-white shadow-sm ring-2 ring-red-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {resetServicio === true && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Sí, realizado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetServicio(false)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      resetServicio === false
                        ? "bg-slate-800 text-white shadow-sm ring-2 ring-slate-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {resetServicio === false && <X className="w-3.5 h-3.5" />}
                    <span>No / No aplica</span>
                  </button>
                </div>
              </div>

              {/* Pregunta 2 */}
              <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-2">
                <span className="font-extrabold text-slate-900 block text-xs">
                  2. ¿Se condujo en carretera?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondujoCarretera(true)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      condujoCarretera === true
                        ? "bg-red-600 text-white shadow-sm ring-2 ring-red-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {condujoCarretera === true && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Sí, se probó</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondujoCarretera(false)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      condujoCarretera === false
                        ? "bg-slate-800 text-white shadow-sm ring-2 ring-slate-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {condujoCarretera === false && <X className="w-3.5 h-3.5" />}
                    <span>No se probó</span>
                  </button>
                </div>
              </div>

              {/* Pregunta 3 */}
              <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-2">
                <span className="font-extrabold text-slate-900 block text-xs">
                  3. ¿Verificar si se solucionó el desperfecto?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDesperfectoSolucionado(true)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      desperfectoSolucionado === true
                        ? "bg-red-600 text-white shadow-sm ring-2 ring-red-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {desperfectoSolucionado === true && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Sí, solucionado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesperfectoSolucionado(false)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      desperfectoSolucionado === false
                        ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {desperfectoSolucionado === false && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>No / Observaciones</span>
                  </button>
                </div>
              </div>

              {/* Pregunta 4 */}
              <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-2">
                <span className="font-extrabold text-slate-900 block text-xs">
                  4. ¿Apareció algún desperfecto no marcado por el cliente luego de la prueba?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDesperfectoNuevo(false)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      desperfectoNuevo === false
                        ? "bg-slate-800 text-white shadow-sm ring-2 ring-slate-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {desperfectoNuevo === false && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>No, ninguno</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesperfectoNuevo(true)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      desperfectoNuevo === true
                        ? "bg-red-600 text-white shadow-sm ring-2 ring-red-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {desperfectoNuevo === true && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>Sí, se detectó</span>
                  </button>
                </div>

                {desperfectoNuevo === true && (
                  <div className="pt-2 animate-in fade-in duration-200 space-y-1">
                    <label className="text-[11px] font-bold text-red-900 block">
                      Detalle del desperfecto detectado tras la prueba: *
                    </label>
                    <textarea
                      rows={2}
                      value={detalleNuevoDesperfecto}
                      onChange={(e) => setDetalleNuevoDesperfecto(e.target.value)}
                      placeholder="Describí el ruido, vibración, testigo encendido o falla observada..."
                      className="w-full text-xs font-medium text-slate-800 bg-white border border-red-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloque 1: Horas Trabajadas */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Horas Trabajadas en el Cierre
              </label>
              <button
                type="button"
                onClick={() => setHoras("0")}
                className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Poner en 0 hs
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  placeholder="0"
                  className="w-full text-lg sm:text-xl font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                  horas
                </span>
              </div>
            </div>

            {/* Accesos rápidos táctiles para sumar horas */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block mb-1.5">
                Sumar tiempo rápido:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {QUICK_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleAddHours(h)}
                    className="py-2 px-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-0.5 shadow-2xs active:scale-95"
                  >
                    <Plus className="w-2.5 h-2.5 opacity-60" />
                    {h}h
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Estas horas se registrarán automáticamente en el historial de trabajo (WorkLog) de la orden.
            </p>
          </div>

          {/* Bloque 2: Nota de Cierre */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              Nota Final de Reparación / Tareas Concluidas
            </label>

            <textarea
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Describí las tareas finales concluidas, ajustes realizados o el resultado de la prueba de ruta..."
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs resize-none"
            />

            {/* Sugerencias Rápidas Táctiles */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Sugerencias rápidas (tocar para agregar):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSetTag(tag)}
                    className="text-[10px] font-medium bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alerta de Requisitos Pendientes */}
          {!canFinalize && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-extrabold block text-rose-950">
                  No se puede finalizar la orden:
                </span>
                <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                  {!hasMechanic && <li>Debe haber un mecánico asignado responsable.</li>}
                  {!hasPeritaje && <li>Debe haberse realizado el peritaje técnico de ingreso.</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Alerta de Flujo: Pendiente de OK del Encargado */}
          <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-[11px] text-amber-950">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold block">Flujo de Control y Entrega</span>
              <p className="text-amber-900 leading-tight">
                Al confirmar, la orden pasa a estado <strong>Listo</strong> y queda registrada la encuesta. El <strong>Encargado de Taller</strong> (Recepción o Administración) deberá verificar estos puntos y dar el <strong>OK definitivo</strong> para habilitar la entrega del auto al cliente.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !canFinalize}
              className="w-full sm:flex-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-center"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando Encuesta y Cerrando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalizar y Enviar a Control de Calidad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
