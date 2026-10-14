"use client";

import React, { useEffect } from "react";
import {
  PackageCheck,
  X,
  Car,
  User,
  Hash,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface ConfirmDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
  orderInfo: {
    numeroOrden: number;
    marca?: string;
    modelo?: string;
    patente: string;
    clienteNombre?: string;
    clienteTelefono?: string;
    fechaIngreso?: string;
  } | null;
}

export default function ConfirmDeliveryModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  orderInfo,
}: ConfirmDeliveryModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !orderInfo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera estilizada institucional */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                ¿Confirmar entrega y archivar?
              </h3>
              <p className="text-xs text-emerald-200/80">
                Paso final del flujo de taller • Concluye la atención
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del modal con detalles de la orden */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Se registrará la salida del vehículo de las instalaciones del taller y la orden quedará sellada en el archivo histórico.
          </p>

          {/* Tarjeta resumen de la unidad */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            {/* Número de orden */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Orden de Trabajo</span>
              </span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                #{orderInfo.numeroOrden}
              </span>
            </div>

            {/* Vehículo y patente */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-sky-600" />
                <span>Vehículo</span>
              </span>
              <div className="flex items-center gap-2 text-right">
                <span className="font-bold text-slate-800">
                  {orderInfo.marca || ""} {orderInfo.modelo || ""}
                </span>
                <span className="font-mono text-[11px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                  {orderInfo.patente}
                </span>
              </div>
            </div>

            {/* Cliente */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente</span>
              </span>
              <span className="font-extrabold text-slate-900 text-right">
                {orderInfo.clienteNombre || "Cliente no especificado"}
              </span>
            </div>
          </div>

          {/* Aviso informativo de archivo */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              El vehículo quedará marcado como <strong>entregado al cliente</strong> y saldrá de las órdenes activas en el taller. Podrás consultar su historial completo en cualquier momento desde la pestaña de <em>Entregadas</em>.
            </p>
          </div>
        </div>

        {/* Acciones de confirmación */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Registrando entrega...</span>
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4 text-white" />
                <span>Confirmar Entrega y Archivar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
