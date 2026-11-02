"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  PackageOpen,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { compressImageClient } from "@/lib/client-compress";

interface PausaRepuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
}

interface RepuestoItemInput {
  id: string;
  nombre: string;
  cantidad: number;
  observaciones?: string;
}

export default function PausaRepuestoModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: PausaRepuestoModalProps) {
  const [fallaReparar, setFallaReparar] = useState("");
  const [items, setItems] = useState<RepuestoItemInput[]>([
    { id: "1", nombre: "", cantidad: 1, observaciones: "" },
  ]);
  const [textoLibre, setTextoLibre] = useState("");

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !order) return null;

  const vehicleName = order.vehicle
    ? `${order.vehicle.marca} ${order.vehicle.modelo}`
    : "Vehículo";
  const patente = order.vehicle?.patente || "SIN PATENTE";

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Math.random().toString(), nombre: "", cantidad: 1, observaciones: "" },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: "1", nombre: "", cantidad: 1, observaciones: "" }]);
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof RepuestoItemInput, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Manejador de carga de foto con compresión
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setUploadingPhoto(true);

    try {
      // 1. Comprimir en cliente para evitar demoras
      let fileToUpload: File = file;
      try {
        const compressed = await compressImageClient(file, 1920, 1920, 0.8);
        fileToUpload = compressed.file;
      } catch (compErr) {
        console.warn("Compresión no disponible, subiendo directo:", compErr);
      }

      // 2. Subir a endpoint
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("folder", "multimedia");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al subir la imagen");
      }

      const data = await res.json();
      setFotoUrl(data.url);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la foto");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fallaReparar.trim()) {
      setErrorMsg("Por favor describa la falla detectada que requiere repuestos.");
      return;
    }

    // Filtrar items no vacíos
    const validItems = items.filter((it) => it.nombre.trim().length > 0);
    if (validItems.length === 0 && !textoLibre.trim()) {
      setErrorMsg("Debe especificar al menos un repuesto necesario.");
      return;
    }

    // Construir la lista consolidada de repuestos
    let repuestosConsolidados = "";
    if (validItems.length > 0) {
      repuestosConsolidados = validItems
        .map(
          (it) =>
            `• ${it.cantidad}x ${it.nombre.trim()}${
              it.observaciones?.trim() ? ` (${it.observaciones.trim()})` : ""
            }`
        )
        .join("\n");
    }
    if (textoLibre.trim()) {
      if (repuestosConsolidados) repuestosConsolidados += "\n\n";
      repuestosConsolidados += `Notas adicionales:\n${textoLibre.trim()}`;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: order.id,
          fallaReparar: fallaReparar.trim(),
          repuestosLista: repuestosConsolidados,
          fotoUrl: fotoUrl || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al pausar la orden");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al procesar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1.5">
                <PackageOpen className="w-3.5 h-3.5" />
                Pausar por Repuestos
              </span>
              <span className="text-amber-100 text-xs font-mono font-bold">
                Orden #{order.numeroOrden}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
              <span>{vehicleName}</span>
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-900 font-mono text-xs font-black tracking-widest uppercase shadow-xs">
                {patente}
              </span>
            </h3>
            <p className="text-xs text-amber-100/90 max-w-lg">
              Indique la falla detectada, la foto de la pieza y los repuestos requeridos para que Administración gestione la compra y Recepción reciba el pedido.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. FOTO DE LA FALLA O REPUESTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Foto de la pieza o falla</span>
                <span className="text-[11px] font-normal lowercase text-slate-400">(Recomendado)</span>
              </label>
              {fotoUrl && (
                <button
                  type="button"
                  onClick={() => setFotoUrl(null)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar foto
                </button>
              )}
            </div>

            {fotoUrl ? (
              <div className="relative rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-3 flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoUrl}
                    alt="Pieza a reparar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Foto de evidencia cargada</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    Esta imagen se enviará a Administración y se anexará a las evidencias de la orden.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputCameraRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputCameraRef.current?.click()}
                  className="p-3.5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 flex items-center justify-center gap-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : (
                    <Camera className="w-4 h-4 text-amber-600" />
                  )}
                  <span>Tomar Foto con Cámara</span>
                </button>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputGalleryRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputGalleryRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  ) : (
                    <Upload className="w-4 h-4 text-slate-600" />
                  )}
                  <span>Subir desde Galería</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. FALLA A REPARAR */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Falla a Reparar o Diagnóstico</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={fallaReparar}
              onChange={(e) => setFallaReparar(e.target.value)}
              placeholder="Ej: Fuga de aceite por retén de bancada trasera y juego excesivo en bieletas de barra estabilizadora..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400 resize-none"
              required
            />
          </div>

          {/* 3. REPUESTOS NECESARIOS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PackageOpen className="w-4 h-4 text-amber-600" />
                <span>Repuestos Necesarios</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Repuesto</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
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
                      handleItemChange(item.id, "cantidad", parseInt(e.target.value) || 1)
                    }
                    className="w-14 px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs text-center font-bold"
                    title="Cantidad"
                  />

                  <input
                    type="text"
                    value={item.nombre}
                    onChange={(e) => handleItemChange(item.id, "nombre", e.target.value)}
                    placeholder="Nombre del repuesto (ej: Bomba de agua)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400"
                  />

                  <input
                    type="text"
                    value={item.observaciones || ""}
                    onChange={(e) =>
                      handleItemChange(item.id, "observaciones", e.target.value)
                    }
                    placeholder="Detalle o marca sugerida (opcional)"
                    className="hidden sm:block w-48 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Notas adicionales para el Administrador / Compras (opcional):
              </label>
              <textarea
                rows={2}
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
                placeholder="Indique si requiere alguna marca en particular, número de pieza o urgencia..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>

          {/* BOTONES DE ACCION */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white text-xs font-extrabold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Pausando orden...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Confirmar y Pausar Orden</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
