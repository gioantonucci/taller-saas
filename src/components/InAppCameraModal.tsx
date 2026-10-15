"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, RotateCcw, Check, RefreshCw, AlertCircle } from "lucide-react";
import { useAppDialog } from "@/components/AppDialog";

interface InAppCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => Promise<void> | void;
}

export default function InAppCameraModal({
  isOpen,
  onClose,
  onCapture,
}: InAppCameraModalProps) {
  const { alert } = useAppDialog();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  // Detener todos los tracks del stream activo
  const stopStream = useCallback((activeStream: MediaStream | null) => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }
  }, []);

  // Iniciar la cámara con el facingMode seleccionado
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    setErrorMsg(null);
    setCapturedBlob(null);
    setCapturedPreview(null);

    // Detener stream previo si existe
    if (stream) {
      stopStream(stream);
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta acceso directo a la cámara. Utilizá la opción de subir desde archivos.");
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Error al inicializar cámara web/móvil:", err);
      // Si falló 'environment' (ej. en PC sin cámara trasera), intentar con cualquier cámara disponible
      if (mode === "environment") {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play().catch(() => {});
          }
          return;
        } catch (fallbackErr: any) {
          setErrorMsg(fallbackErr?.message || "No se pudo acceder a la cámara. Verificá los permisos del navegador.");
          return;
        }
      }

      setErrorMsg(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Permiso de cámara denegado. Habilitá el acceso a la cámara en los ajustes del navegador."
          : err?.message || "No se pudo inicializar la cámara."
      );
    }
  }, [stream, stopStream]);

  // Manejar apertura y cierre
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream(stream);
      setStream(null);
      setCapturedBlob(null);
      setCapturedPreview(null);
      setErrorMsg(null);
    }

    return () => {
      stopStream(stream);
    };
  }, [isOpen]);

  // Cambiar entre cámara trasera y delantera
  const toggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capturar fotograma actual del video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Efecto flash visual
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreview(url);
      },
      "image/jpeg",
      0.9
    );
  };

  // Confirmar y subir foto capturada
  const handleConfirmPhoto = async () => {
    if (!capturedBlob) return;
    setSaving(true);
    try {
      const filename = `peritaje-camara-${Date.now()}.jpg`;
      const file = new File([capturedBlob], filename, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      await onCapture(file);
      handleClose();
    } catch (err: any) {
      await alert({
        title: "Error al guardar fotografía",
        message: err?.message || "No se pudo procesar la fotografía tomada.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  // Descartar captura y volver al visor en vivo
  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    if (videoRef.current && stream) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleClose = () => {
    stopStream(stream);
    setStream(null);
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black text-white select-none animate-in fade-in duration-200">
      {/* Barra superior con controles */}
      <div className="shrink-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-600/30 border border-rose-500/50 flex items-center justify-center">
            <Camera className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-tight">CÁMARA DE PERITAJE</h3>
            <p className="text-[10px] text-slate-400">Captura fotográfica directa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!capturedPreview && (
            <button
              type="button"
              onClick={toggleCamera}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/10"
              title="Girar cámara (Trasera / Frontal)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-rose-900/60 active:scale-95 transition-all text-white border border-white/10"
            title="Cerrar cámara"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visor de Cámara o Vista Previa de Foto Capturada */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-950">
        {/* Flash visual */}
        {flash && <div className="absolute inset-0 bg-white z-20 animate-out fade-out duration-150" />}

        {errorMsg ? (
          <div className="p-6 text-center max-w-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-900/40 text-rose-400 border border-rose-700/60 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-xs text-rose-200 leading-relaxed">{errorMsg}</p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-700"
              >
                Reintentar acceso a cámara
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md"
              >
                Cerrar y usar selector de archivos
              </button>
            </div>
          </div>
        ) : capturedPreview ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={capturedPreview}
              alt="Fotografía capturada"
              className="max-h-full max-w-full object-contain"
            />
            <div className="absolute top-4 left-4 bg-emerald-600/90 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-md backdrop-blur-xs">
              Foto Capturada
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Barra Inferior de Acción */}
      <div className="shrink-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-around z-10">
        {capturedPreview ? (
          <div className="w-full max-w-xs flex items-center justify-between gap-4 mx-auto">
            {/* Repetir foto */}
            <button
              type="button"
              onClick={handleRetake}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Tomar Otra</span>
            </button>

            {/* Aceptar y subir */}
            <button
              type="button"
              onClick={handleConfirmPhoto}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? "Subiendo..." : "Guardar Foto"}</span>
            </button>
          </div>
        ) : (
          !errorMsg && (
            <div className="flex flex-col items-center gap-2">
              {/* Botón Disparador estilo Cámara Nativa */}
              <button
                type="button"
                onClick={takeSnapshot}
                className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all shadow-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                title="Tomar fotografía"
              >
                <div className="w-14 h-14 rounded-full bg-white shadow-inner" />
              </button>
              <span className="text-[11px] font-bold text-slate-300">Tocar para capturar</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
