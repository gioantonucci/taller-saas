"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(currentSig));
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Inicializar canvas y cargar firma existente si hay
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configuración para pantallas de alta densidad (Retina)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#0f172a"; // Tinta oscura (slate-900)
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasDrawn(false);
    }
  }, [initialSignature]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      // Solo reiniciar si no había dibujado para evitar borrar la firma accidentalmente
      if (!hasDrawn) initCanvas();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas, hasDrawn]);

  // Obtener coordenadas relativas al canvas
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setLastPoint(coords);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly || !lastPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPoint = getCoordinates(e);

    // Trazo suavizado
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    const midX = (lastPoint.x + currentPoint.x) / 2;
    const midY = (lastPoint.y + currentPoint.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    setLastPoint(currentPoint);
    if (!hasDrawn) setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPoint(null);

    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-800 flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-emerald-600" />
          <span>Firma del Cliente en Tablet</span>
          <span className="text-[10px] text-slate-500 font-normal">(con dedo o lápiz)</span>
        </label>
        {!readOnly && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Borrar Firma</span>
          </button>
        )}
      </div>

      <div
        className={`relative w-full rounded-2xl border-2 transition-all overflow-hidden bg-white ${
          hasDrawn
            ? "border-emerald-400 shadow-sm"
            : "border-slate-300 border-dashed hover:border-slate-400"
        } ${readOnly ? "bg-slate-50 opacity-90 cursor-not-allowed" : "cursor-crosshair"}`}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          style={{ touchAction: "none", width: "100%", height: "100%" }}
          className="block w-full h-full"
        />

        {/* Guía visual para firma (línea y X) */}
        {!hasDrawn && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 pb-5 select-none">
            <div className="border-b border-slate-300 pb-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="font-mono text-slate-300">✕ Firma del cliente</span>
              <span>Firme aquí</span>
            </div>
          </div>
        )}

        {/* Badge indicador de estado */}
        {hasDrawn && (
          <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold shadow-2xs">
            <Check className="w-3 h-3" />
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
