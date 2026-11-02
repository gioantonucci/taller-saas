"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  Upload,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  PackageOpen,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { compressImageClient } from "@/lib/client-compress";

interface PausaRepuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  existingRequest?: any; // Para modo "Reenviar pedido devuelto"
  onSuccess: () => void;
}

interface ItemSolicitadoInput {
  id: string;
  descripcion: string;
  cantidad: number;
}

interface PhotoInput {
  id: string;
  url: string;
  nota: string;
}

const COMMON_REPAIRS = [
  "Pastillas y Discos de Freno",
  "Kit de Distribución",
  "Kit de Embrague",
  "Amortiguadores y Coperos",
  "Bomba de Agua y Mangueras",
  "Bujías y Bobinas de Encendido",
  "Rótulas y Extremos de Dirección",
  "Batería y Alternador",
];

export default function PausaRepuestoModal({
  isOpen,
  onClose,
  order,
  existingRequest,
  onSuccess,
}: PausaRepuestoModalProps) {
  const isResending = Boolean(existingRequest && existingRequest.estado === "DEVUELTO");

  const [fallaReparar, setFallaReparar] = useState("");
  const [items, setItems] = useState<ItemSolicitadoInput[]>([
    { id: "item-1", descripcion: "", cantidad: 1 },
  ]);
  const [observacionesMecanico, setObservacionesMecanico] = useState("");
  const [fotos, setFotos] = useState<PhotoInput[]>([]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  // Inicializar con datos si es reenvío de devuelto o apertura
  useEffect(() => {
    if (existingRequest) {
      setFallaReparar(existingRequest.fallaReparar || "");
      setObservacionesMecanico(existingRequest.observacionesMecanico || "");

      // Ítems solicitados
      try {
        if (existingRequest.itemsSolicitados) {
          const parsed =
            typeof existingRequest.itemsSolicitados === "string"
              ? JSON.parse(existingRequest.itemsSolicitados)
              : existingRequest.itemsSolicitados;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(
              parsed.map((it: any, idx: number) => ({
                id: it.id || `item-${idx}`,
                descripcion: it.descripcion || it.nombre || "",
                cantidad: it.cantidad || 1,
              }))
            );
          }
        }
      } catch {}

      // Fotos
      try {
        if (existingRequest.fotos) {
          const parsedFotos =
            typeof existingRequest.fotos === "string"
              ? JSON.parse(existingRequest.fotos)
              : existingRequest.fotos;
          if (Array.isArray(parsedFotos)) {
            setFotos(
              parsedFotos.map((f: any, idx: number) => ({
                id: f.id || `foto-${idx}`,
                url: f.url,
                nota: f.nota || "",
              }))
            );
          }
        } else if (existingRequest.fotoUrl) {
          setFotos([
            { id: "foto-0", url: existingRequest.fotoUrl, nota: "Foto inicial" },
          ]);
        }
      } catch {}
    } else {
      setFallaReparar("");
      setItems([{ id: "item-1", descripcion: "", cantidad: 1 }]);
      setObservacionesMecanico("");
      setFotos([]);
      setErrorMsg(null);
    }
  }, [existingRequest, isOpen]);

  if (!isOpen || !order) return null;

  const vehicleName = order.vehicle
    ? `${order.vehicle.marca} ${order.vehicle.modelo}`
    : "Vehículo";
  const patente = order.vehicle?.patente || "SIN PATENTE";

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, descripcion: "", cantidad: 1 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: "item-1", descripcion: "", cantidad: 1 }]);
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemSolicitadoInput, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleQuantityAdjust = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const newQty = Math.max(1, (it.cantidad || 1) + delta);
        return { ...it, cantidad: newQty };
      })
    );
  };

  // Carga de fotografías con compresión móvil y nota anclada
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setUploadingPhoto(true);

    try {
      let fileToUpload: File = file;
      try {
        const compressed = await compressImageClient(file, 1920, 1920, 0.8);
        fileToUpload = compressed.file;
      } catch (compErr) {
        console.warn("Compresión no disponible:", compErr);
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("folder", "repuestos");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al subir la imagen");
      }

      const data = await res.json();
      setFotos((prev) => [
        ...prev,
        {
          id: `foto-${Date.now()}`,
          url: data.url,
          nota: "",
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al subir la fotografía");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleUpdatePhotoNote = (photoId: string, nota: string) => {
    setFotos((prev) =>
      prev.map((f) => (f.id === photoId ? { ...f, nota } : f))
    );
  };

  const handleRemovePhoto = (photoId: string) => {
    setFotos((prev) => prev.filter((f) => f.id !== photoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validación 1: Falla a reparar obligatoria
    if (!fallaReparar.trim()) {
      setErrorMsg("Debe especificar qué se va a reparar con los repuestos (obligatorio).");
      return;
    }

    // Validación 2: Al menos un repuesto con descripción
    const validItems = items
      .filter((it) => it.descripcion.trim().length > 0)
      .map((it) => ({
        id: it.id,
        descripcion: it.descripcion.trim(),
        cantidad: Math.max(1, Number(it.cantidad) || 1),
      }));

    if (validItems.length === 0) {
      setErrorMsg("Debe ingresar al menos un repuesto solicitado con su descripción.");
      return;
    }

    setSubmitting(true);
    try {
      let res: Response;

      if (isResending && existingRequest) {
        // Reenvío de pedido devuelto
        res = await fetch(`/api/spare-parts/${existingRequest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REENVIAR",
            fallaReparar: fallaReparar.trim(),
            itemsSolicitados: validItems,
            observacionesMecanico: observacionesMecanico.trim() || undefined,
            fotos: fotos.length > 0 ? fotos : undefined,
          }),
        });
      } else {
        // Creación de nuevo pedido
        res = await fetch("/api/spare-parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workOrderId: order.id,
            fallaReparar: fallaReparar.trim(),
            itemsSolicitados: validItems,
            observacionesMecanico: observacionesMecanico.trim() || undefined,
            fotos: fotos.length > 0 ? fotos : undefined,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al procesar la solicitud de repuestos");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al procesar el pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-4 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1.5">
                <PackageOpen className="w-3.5 h-3.5" />
                {isResending ? "Corregir y Reenviar Pedido" : "Pedir Repuestos • Pausar Orden"}
              </span>
              <span className="text-amber-100 text-xs font-mono font-bold">
                Orden #{order.numeroOrden}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{vehicleName}</span>
              <span className="bg-slate-950/40 text-amber-200 font-mono text-xs px-2 py-0.5 rounded-md border border-white/20">
                {patente}
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA DE DEVOLUCIÓN SI ES MODO REENVÍO */}
        {isResending && existingRequest?.motivoDevolucion && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-900 uppercase">
                Observación del Administrador al devolver:
              </p>
              <p className="text-xs font-medium text-rose-800 mt-0.5">
                "{existingRequest.motivoDevolucion}"
              </p>
            </div>
          </div>
        )}

        {/* MENSAJE DE ERROR */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-900 text-xs font-bold animate-in shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* 1. ¿QUÉ SE VA A REPARAR? (Obligatorio) */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
              1. ¿Qué se va a reparar con los repuestos? <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={fallaReparar}
              onChange={(e) => setFallaReparar(e.target.value)}
              placeholder="Ej: Cambio de pastillas y discos delanteros por desgaste crítico..."
              className="w-full text-sm p-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:outline-hidden transition-all bg-slate-50/50 resize-none font-medium"
            />
            {/* Sugerencias rápidas para escribir con 1 tap en el celular */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Taps rápidos:
              </span>
              {COMMON_REPAIRS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setFallaReparar((prev) => (prev ? `${prev}, ${tag}` : tag));
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[11px] font-bold border border-slate-200 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 2. LISTA DE REPUESTOS SOLICITADOS (Al menos 1) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                2. Repuestos Necesarios <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Ítem</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  {/* Nombre/Descripción del repuesto */}
                  <input
                    type="text"
                    required
                    value={item.descripcion}
                    onChange={(e) => handleItemChange(item.id, "descripcion", e.target.value)}
                    placeholder="Ej: Juego pastillas delanteras Bosch"
                    className="flex-1 text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-amber-500 focus:outline-hidden font-medium min-w-0"
                  />

                  {/* Selector de cantidad con botones grandes táctiles */}
                  <div className="flex items-center bg-white rounded-xl border border-slate-300 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityAdjust(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-xl font-bold cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-slate-900">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityAdjust(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-xl font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Eliminar fila */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0"
                      title="Eliminar repuesto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. OBSERVACIONES DEL MECÁNICO (Opcional) */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
              3. Observaciones Adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacionesMecanico}
              onChange={(e) => setObservacionesMecanico(e.target.value)}
              placeholder="Ej: Si es posible pedir marca original o de primera línea..."
              className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-slate-200 focus:border-amber-500 focus:outline-hidden bg-slate-50/50 resize-none font-medium"
            />
          </div>

          {/* 4. FOTOGRAFÍAS CON NOTAS ANCLADAS (Opcional) */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
              <span>4. Fotos del Repuesto Roto / Despiece (Opcional)</span>
              <span className="text-[11px] font-normal text-slate-400">
                {fotos.length} adjuntada{fotos.length !== 1 ? "s" : ""}
              </span>
            </label>

            {/* Galería de fotos cargadas con nota anclada */}
            {fotos.length > 0 && (
              <div className="space-y-2.5">
                {fotos.map((foto, idx) => (
                  <div
                    key={foto.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <img
                      src={foto.url}
                      alt={`Foto repuesto ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-300 shrink-0 shadow-2xs"
                    />
                    <div className="flex-1 w-full min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                        <MessageSquare className="w-3 h-3 text-amber-500" />
                        <span>Nota anclada a esta foto:</span>
                      </div>
                      <input
                        type="text"
                        value={foto.nota}
                        onChange={(e) => handleUpdatePhotoNote(foto.id, e.target.value)}
                        placeholder="Ej: Rajadura en la carcasa, desgaste del disco..."
                        className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(foto.id)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 self-end sm:self-auto shrink-0"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botones grandes de cámara y galería para mobile */}
            <div className="grid grid-cols-2 gap-3">
              <input
                ref={fileInputCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputCameraRef.current?.click()}
                className="py-3 px-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-amber-600" />
                )}
                <span>Tomar Foto</span>
              </button>

              <input
                ref={fileInputGalleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputGalleryRef.current?.click()}
                className="py-3 px-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Subir de Galería</span>
              </button>
            </div>
          </div>

          {/* AVISO DE CAMBIO DE ESTADO DE LA ORDEN */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
            <PackageOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">
                {isResending
                  ? "El pedido volverá al estado 'Solicitado' para nueva revisión del Administrador."
                  : "La orden pasará automáticamente a estado 'En espera' (motivo: repuesto)."}
              </span>
              <span className="text-[11px] text-amber-800">
                Podrás reanudar la reparación una vez que los repuestos hayan sido recibidos en el taller.
              </span>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN INFERIORES */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer min-h-[48px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando Pedido...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isResending ? "Reenviar Pedido Corregido" : "Confirmar y Pausar"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
