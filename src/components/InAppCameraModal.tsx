"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Video, X, RotateCcw, Check, RefreshCw, AlertCircle, Play, Square } from "lucide-react";
import { useAppDialog } from "@/components/AppDialog";

interface InAppCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, tipo: "FOTO" | "VIDEO") => Promise<void> | void;
  initialMode?: "FOTO" | "VIDEO";
}

export default function InAppCameraModal({
  isOpen,
  onClose,
  onCapture,
  initialMode = "FOTO",
}: InAppCameraModalProps) {
  const { alert } = useAppDialog();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [captureMode, setCaptureMode] = useState<"FOTO" | "VIDEO">(initialMode || "FOTO");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  // Grabación de video
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
  const startCamera = useCallback(async (mode: "environment" | "user", withAudio: boolean = false) => {
    setErrorMsg(null);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (stream) {
      stopStream(stream);
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta acceso directo a la cámara. Utilizá la opción de subir desde archivos.");
      }

      let newStream: MediaStream;
      const videoConstraints: MediaTrackConstraints = withAudio
        ? {
            facingMode: { ideal: mode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 24, max: 30 },
          }
        : {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: withAudio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
              }
            : false,
        });
      } catch (audioErr) {
        // Fallback sin audio si el micrófono genera error de permisos
        newStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      }

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Error al inicializar cámara web/móvil:", err);
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
      const modeToUse = initialMode || "FOTO";
      setCaptureMode(modeToUse);
      startCamera(facingMode, modeToUse === "VIDEO");
    } else {
      stopStream(stream);
      setStream(null);
      setCapturedBlob(null);
      setCapturedPreview(null);
      setErrorMsg(null);
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      stopStream(stream);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, initialMode]);

  // Cambiar entre Foto y Video
  const handleSwitchMode = (mode: "FOTO" | "VIDEO") => {
    if (isRecording) {
      stopRecording();
    }
    setCaptureMode(mode);
    setCapturedBlob(null);
    setCapturedPreview(null);
    startCamera(facingMode, mode === "VIDEO");
  };

  // Cambiar entre cámara trasera y delantera
  const toggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode, captureMode === "VIDEO");
  };

  // Capturar fotograma actual (FOTO)
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

  // Iniciar grabación de video
  const startRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];

    try {
      let mimeType = "video/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
          mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mimeType = "video/webm";
        }
      }

      let recorder: MediaRecorder;
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 800_000, // 800 kbps: excelente balance 720p y bajo peso (~100 KB/s)
        audioBitsPerSecond: 64_000,
      };

      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(stream, { mimeType });
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setCapturedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setCapturedPreview(url);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Error al iniciar MediaRecorder:", err);
      setErrorMsg("No se pudo iniciar la grabación de video en este navegador.");
    }
  };

  // Detener grabación de video
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  // Confirmar y subir foto o video capturado
  const handleConfirmMedia = async () => {
    if (!capturedBlob) return;

    const isVid = captureMode === "VIDEO";
    if (isVid && capturedBlob.size > 4.5 * 1024 * 1024) {
      await alert({
        title: "Video demasiado grande",
        message: `El video grabado (${(capturedBlob.size / (1024 * 1024)).toFixed(1)} MB) supera el límite de 4.5 MB soportado por el servidor en la nube. Por favor, grabá una toma más breve (de hasta 20 o 25 segundos).`,
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const rawMime = capturedBlob.type || (isVid ? "video/webm" : "image/jpeg");
      const cleanMime = rawMime.split(";")[0].trim().toLowerCase();
      const ext = isVid
        ? cleanMime.includes("mp4") ? ".mp4" : ".webm"
        : ".jpg";
      const filename = `peritaje-${isVid ? "video" : "camara"}-${Date.now()}${ext}`;

      const file = new File([capturedBlob], filename, {
        type: cleanMime,
        lastModified: Date.now(),
      });

      await onCapture(file, isVid ? "VIDEO" : "FOTO");
      handleClose();
    } catch (err: any) {
      await alert({
        title: "Error al guardar evidencia",
        message: err?.message || "No se pudo procesar el archivo capturado.",
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
    if (isRecording) {
      stopRecording();
    }
    stopStream(stream);
    setStream(null);
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    onClose();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black text-white select-none animate-in fade-in duration-200">
      {/* Barra superior con controles */}
      <div className="shrink-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-600/30 border border-rose-500/50 flex items-center justify-center">
            {captureMode === "VIDEO" ? (
              <Video className="w-4 h-4 text-rose-500 animate-pulse" />
            ) : (
              <Camera className="w-4 h-4 text-sky-400" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-black tracking-tight uppercase">
              {captureMode === "VIDEO" ? "Grabación de Video Peritaje" : "Cámara de Peritaje"}
            </h3>
            <p className="text-[10px] text-slate-400">
              {captureMode === "VIDEO" ? "Evidencia de ruidos o fallas en vivo" : "Captura fotográfica directa"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!capturedPreview && !isRecording && (
            <button
              type="button"
              onClick={toggleCamera}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/10 cursor-pointer"
              title="Girar cámara (Trasera / Frontal)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-rose-900/60 active:scale-95 transition-all text-white border border-white/10 cursor-pointer"
            title="Cerrar visor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visor de Cámara o Vista Previa Capturada */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-950">
        {flash && <div className="absolute inset-0 bg-white z-20 animate-out fade-out duration-150" />}

        {/* Indicador de grabación activo */}
        {isRecording && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-rose-600/90 text-white font-mono font-bold text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-xs animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>REC {formatTimer(recordingSeconds)} / 00:30</span>
          </div>
        )}

        {errorMsg ? (
          <div className="p-6 text-center max-w-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-900/40 text-rose-400 border border-rose-700/60 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-xs text-rose-200 leading-relaxed">{errorMsg}</p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode, captureMode === "VIDEO")}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                Reintentar acceso a cámara
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md cursor-pointer"
              >
                Cerrar y usar selector de archivos
              </button>
            </div>
          </div>
        ) : capturedPreview ? (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {captureMode === "VIDEO" ? (
              <video
                src={capturedPreview}
                controls
                playsInline
                autoPlay
                className="max-h-full max-w-full rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={capturedPreview}
                alt="Fotografía capturada"
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}
            <div className="absolute top-6 left-6 bg-emerald-600/95 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-md backdrop-blur-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>
                {captureMode === "VIDEO" ? "Video Registrado" : "Foto Capturada"}
                {capturedBlob ? ` (${(capturedBlob.size / (1024 * 1024)).toFixed(1)} MB)` : ""}
              </span>
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

      {/* Selector de modo Foto / Video (cuando no hay captura pendiente y no se está grabando) */}
      {!capturedPreview && !isRecording && (
        <div className="py-2 flex items-center justify-center gap-2 bg-black/60 z-10">
          <button
            type="button"
            onClick={() => handleSwitchMode("FOTO")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              captureMode === "FOTO"
                ? "bg-white text-slate-900 shadow-md scale-105"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("VIDEO")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              captureMode === "VIDEO"
                ? "bg-rose-600 text-white shadow-md scale-105"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>
        </div>
      )}

      {/* Barra Inferior de Acción */}
      <div className="shrink-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-around z-10">
        {capturedPreview ? (
          <div className="w-full max-w-xs flex items-center justify-between gap-4 mx-auto">
            {/* Repetir */}
            <button
              type="button"
              onClick={handleRetake}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>{captureMode === "VIDEO" ? "Grabar Otro" : "Tomar Otra"}</span>
            </button>

            {/* Aceptar y subir */}
            <button
              type="button"
              onClick={handleConfirmMedia}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {saving
                  ? "Subiendo..."
                  : captureMode === "VIDEO"
                  ? "Guardar Video"
                  : "Guardar Foto"}
              </span>
            </button>
          </div>
        ) : (
          !errorMsg && (
            <div className="flex flex-col items-center gap-2">
              {captureMode === "FOTO" ? (
                /* Botón Disparador Foto */
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all shadow-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                  title="Tomar fotografía"
                >
                  <div className="w-14 h-14 rounded-full bg-white shadow-inner" />
                </button>
              ) : (
                /* Botón Disparador Video */
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all shadow-xl cursor-pointer ${
                    isRecording ? "bg-rose-950/60" : "bg-white/10 hover:bg-white/20"
                  }`}
                  title={isRecording ? "Detener grabación" : "Iniciar grabación de video"}
                >
                  {isRecording ? (
                    <div className="w-7 h-7 rounded-sm bg-rose-600 shadow-lg animate-pulse" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-rose-600 shadow-inner" />
                  )}
                </button>
              )}
              <span className="text-[11px] font-bold text-slate-300">
                {captureMode === "FOTO"
                  ? "Tocar para tomar foto"
                  : isRecording
                  ? "Tocar para finalizar grabación"
                  : "Tocar para iniciar grabación (máx 30 seg)"}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
