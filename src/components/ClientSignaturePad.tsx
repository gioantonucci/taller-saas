"use client";

import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

interface ClientSignaturePadProps {
  initialSignature?: string | null;
  value?: string | null;
  onChange: (signatureDataUrl: string | null) => void;
  readOnly?: boolean;
  height?: number;
  title?: string;
}

export default function ClientSignaturePad({
  initialSignature,
  value,
  onChange,
  readOnly = false,
  height = 180,
  title,
}: ClientSignaturePadProps) {
  const currentSig = value !== undefined ? value : initialSignature;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Estados de interfaz
  const [hasDrawn, setHasDrawn] = useState(Boolean(currentSig));

  // Refs de dibujo para evitar re-renders innecesarios durante el trazo continuo
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(Boolean(currentSig));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isInitializedRef = useRef(false);
  const currentSignatureDataUrlRef = useRef<string | null>(currentSig || null);

  // Mantener actualizado el callback onChange
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Inicializar dimensiones del canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    // Si ya tiene el tamaño correcto y ya está inicializado, no redimensionar (redimensionar borra el canvas)
    if (isInitializedRef.current && canvas.width === targetWidth && canvas.height === targetHeight) {
      return;
    }

    // Si ya teníamos un dibujo antes de redimensionar, guardarlo para re-dibujarlo
    let savedDataUrl: string | null = null;
    if (hasDrawnRef.current && isInitializedRef.current) {
      try {
        savedDataUrl = canvas.toDataURL("image/png");
      } catch {}
    } else if (currentSignatureDataUrlRef.current) {
      savedDataUrl = currentSignatureDataUrlRef.current;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0f172a"; // Tinta oscura visible y profesional
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (typeof ctx.setLineDash === "function") {
      ctx.setLineDash([]);
    }

    if (savedDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        hasDrawnRef.current = true;
        setHasDrawn(true);
      };
      img.src = savedDataUrl;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }

    isInitializedRef.current = true;
  };

  // Inicialización en montaje y con ResizeObserver
  useEffect(() => {
    setupCanvas();

    // Reintentar si el canvas estaba oculto o en animación del modal
    const frameId = requestAnimationFrame(() => {
      setupCanvas();
    });

    const timer = setTimeout(() => {
      setupCanvas();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      setupCanvas();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  // Si cambia externamente el valor de la firma a null (por ejemplo al resetear formulario)
  useEffect(() => {
    if (value === null && hasDrawnRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
        }
      }
      hasDrawnRef.current = false;
      setHasDrawn(false);
      currentSignatureDataUrlRef.current = null;
    }
  }, [value]);

  // Obtener coordenadas relativas en píxeles CSS
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Inicio de trazo (con soporte unificado de Pointer Events: dedo, lápiz, ratón)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();

    // Capturar el puntero para que no se pierda el trazo si el dedo sale del recuadro
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Asegurar que el contexto tenga el estilo de trazo correcto
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([]);
      }
    }

    const coords = getCoordinates(e.clientX, e.clientY);
    isDrawingRef.current = true;
    lastPointRef.current = coords;

    // Dibujar un punto inicial en caso de que sea solo un toque/punto
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
    }
  };

  // Movimiento de trazo continuo fluido y sólido (sin discontinuidades ni líneas de puntos)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readOnly || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (typeof ctx.setLineDash === "function") {
      ctx.setLineDash([]);
    }

    // Coalesced events para registrar micro-movimientos en tablets y pantallas táctiles
    const events =
      typeof (e.nativeEvent as any)?.getCoalescedEvents === "function"
        ? (e.nativeEvent as any).getCoalescedEvents()
        : [e];

    for (const ev of events) {
      const currentCoords = getCoordinates(ev.clientX, ev.clientY);
      const last = lastPointRef.current;
      if (!last) continue;

      // Trazo continuo directo y sellado de punto a punto (sin vacíos ni discontinuidades)
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();

      lastPointRef.current = currentCoords;
    }

    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawn(true);
    }
  };

  // Fin de trazo
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    isDrawingRef.current = false;
    lastPointRef.current = null;

    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      const dataUrl = canvas.toDataURL("image/png");
      currentSignatureDataUrlRef.current = dataUrl;
      onChangeRef.current(dataUrl);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerUp(e);
  };

  // Limpiar firma
  const handleClear = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawnRef.current = false;
    currentSignatureDataUrlRef.current = null;
    setHasDrawn(false);
    onChangeRef.current(null);
  };

  // Evitar scroll táctil cuando se dibuja en tablets/móviles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchScroll = (e: TouchEvent) => {
      if (isDrawingRef.current) {
        e.preventDefault();
      }
    };

    canvas.addEventListener("touchstart", preventTouchScroll, { passive: false });
    canvas.addEventListener("touchmove", preventTouchScroll, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", preventTouchScroll);
      canvas.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-800 flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{title || "Firma del Cliente en Tablet"}</span>
          <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
            (con dedo o lápiz táctil)
          </span>
        </label>
        {!readOnly && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
            title="Borrar y firmar nuevamente"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Borrar Firma</span>
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl border-2 transition-all overflow-hidden bg-white touch-none ${
          hasDrawn
            ? "border-emerald-400 shadow-sm"
            : "border-slate-300 border-dashed hover:border-slate-400"
        } ${readOnly ? "bg-slate-50 opacity-90 cursor-not-allowed" : "cursor-crosshair"}`}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{ touchAction: "none", width: "100%", height: "100%" }}
          className="block w-full h-full touch-none select-none"
        />

        {/* Guía visual para firma (línea y X) */}
        {!hasDrawn && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 pb-5 select-none">
            <div className="border-b border-slate-300 pb-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="font-mono text-slate-300">✕ Firma del cliente</span>
              <span>Firme aquí con el dedo o lápiz</span>
            </div>
          </div>
        )}

        {/* Badge indicador de estado */}
        {hasDrawn && (
          <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold shadow-2xs">
            <Check className="w-3.5 h-3.5" />
            <span>Firma registrada</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 italic">
        Esta firma quedará estampada en el Resguardo de Depósito oficial conforme a normativa.
      </p>
    </div>
  );
}
