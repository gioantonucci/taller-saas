"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Trash2,
  Check,
  Car,
} from "lucide-react";
import { DamagePin } from "@/types";
import { useAppDialog } from "@/components/AppDialog";

interface CarDamageBlueprintProps {
  pins: DamagePin[];
  onChange?: (pins: DamagePin[]) => void;
  readOnly?: boolean;
}

// Determina la zona estimada del vehículo en base a las coordenadas relativas (X: 0-100%, Y: 0-100%)
function estimateZone(x: number, y: number): string {
  let vertical = "Medio";
  if (y < 20) vertical = "Paragolpe / Frente Delantero";
  else if (y < 35) vertical = "Capot / Ópticas Delanteras";
  else if (y < 48) vertical = "Parabrisas / Techo Delantero";
  else if (y < 65) vertical = "Techo Central / Cabina";
  else if (y < 80) vertical = "Luneta Trasera / Techo Trasero";
  else if (y < 90) vertical = "Baúl / Portón Trasero";
  else vertical = "Paragolpe Trasero";

  let horizontal = "Centro";
  if (x < 32) horizontal = "Lateral Izquierdo (Conductor)";
  else if (x > 68) horizontal = "Lateral Derecho (Acompañante)";

  return `${vertical} • ${horizontal}`;
}

const TIPO_DANIO_INFO: Record<
  DamagePin["tipo"],
  { label: string; color: string; badgeBg: string; border: string; icon: string }
> = {
  RAYON: {
    label: "Rayón / Raspón",
    color: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-800",
    border: "border-amber-400",
    icon: "⚡",
  },
  ABOLLADURA: {
    label: "Abolladura / Golpe",
    color: "bg-rose-600",
    badgeBg: "bg-rose-50 text-rose-800",
    border: "border-rose-400",
    icon: "💥",
  },
  ROTURA: {
    label: "Rotura / Fisura",
    color: "bg-purple-600",
    badgeBg: "bg-purple-50 text-purple-800",
    border: "border-purple-400",
    icon: "💔",
  },
  PINTURA: {
    label: "Pintura Saltada",
    color: "bg-sky-600",
    badgeBg: "bg-sky-50 text-sky-800",
    border: "border-sky-400",
    icon: "🎨",
  },
};

export default function CarDamageBlueprint({
  pins = [],
  onChange,
  readOnly = false,
}: CarDamageBlueprintProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal para agregar nuevo pin
  const { confirm } = useAppDialog();
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<DamagePin["tipo"]>("RAYON");
  const [selectedSeveridad, setSelectedSeveridad] = useState<"LEVE" | "MODERADO" | "GRAVE">("LEVE");
  const [descripcion, setDescripcion] = useState("");

  // Modal para ver o borrar pin existente
  const [activePin, setActivePin] = useState<DamagePin | null>(null);

  const handleBlueprintClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const x = Math.max(2, Math.min(98, Math.round((clickX / rect.width) * 100)));
    const y = Math.max(2, Math.min(98, Math.round((clickY / rect.height) * 100)));

    setPendingCoords({ x, y });
    setDescripcion("");
    setSelectedTipo("RAYON");
    setSelectedSeveridad("LEVE");
  };

  const handleSavePin = () => {
    if (!pendingCoords || !onChange) return;

    const estimated = estimateZone(pendingCoords.x, pendingCoords.y);
    const newPin: DamagePin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: pendingCoords.x,
      y: pendingCoords.y,
      tipo: selectedTipo,
      severidad: selectedSeveridad,
      descripcion: descripcion.trim() || `${TIPO_DANIO_INFO[selectedTipo].label} en ${estimated}`,
      fecha: new Date().toISOString(),
    };

    onChange([...pins, newPin]);
    setPendingCoords(null);
  };

  const handleDeletePin = (pinId: string) => {
    if (!onChange || readOnly) return;
    onChange(pins.filter((p) => p.id !== pinId));
    setActivePin(null);
  };

  const handleClearAll = async () => {
    if (!onChange || readOnly) return;
    const isConfirmed = await confirm({
      title: "¿Borrar todos los marcadores?",
      message: "Se eliminarán todos los pines de daños registrados en el diagrama de carrocería del vehículo.",
      confirmText: "Borrar marcadores",
      cancelText: "Cancelar",
      variant: "danger",
      icon: "trash",
    });

    if (isConfirmed) {
      onChange([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Instrucciones Mobile-First */}
      <div className="flex items-center justify-between bg-slate-100/80 p-3 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="font-semibold text-slate-800">
            {readOnly
              ? `Esquema de Daños (${pins.length} marcadores)`
              : "Hacé 'tap' sobre el auto para marcar un daño"}
          </span>
        </div>
        {pins.length > 0 && !readOnly && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Contenedor del Esquema Vectorial del Auto (Top-down view) */}
      <div className="relative flex justify-center">
        <div
          ref={containerRef}
          onClick={handleBlueprintClick}
          className={`relative w-full max-w-[280px] sm:max-w-[320px] aspect-[300/560] bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-3 shadow-inner border border-slate-800 select-none ${
            readOnly ? "cursor-default" : "cursor-crosshair active:scale-[0.99] transition-transform"
          }`}
        >
          {/* Indicadores de Orientación */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-sky-400/80 uppercase pointer-events-none">
            ▲ FRENTE / DELANTERA ▲
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-slate-500 uppercase pointer-events-none">
            ▼ TRASERA / BAÚL ▼
          </div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-bold tracking-wider text-slate-500 uppercase pointer-events-none">
            CONDUCTOR (IZQ)
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 rotate-90 text-[8px] font-bold tracking-wider text-slate-500 uppercase pointer-events-none">
            ACOMPAÑANTE (DER)
          </div>

          {/* SVG Vectorial del Vehículo visto desde arriba */}
          <svg
            viewBox="0 0 300 560"
            className="w-full h-full pointer-events-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Sombras del chasis */}
            <path
              d="M75 90 C75 50 110 35 150 35 C190 35 225 50 225 90 L235 200 C238 240 238 340 235 380 L225 490 C225 525 190 535 150 535 C110 535 75 525 75 490 L65 380 C62 340 62 240 65 200 Z"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="3"
            />

            {/* Ruedas (4 esquinas) */}
            <rect x="42" y="95" width="22" height="52" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="236" y="95" width="22" height="52" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="42" y="415" width="22" height="52" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="236" y="415" width="22" height="52" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />

            {/* Carrocería Principal */}
            <path
              d="M80 95 C80 60 115 45 150 45 C185 45 220 60 220 95 L228 190 C230 230 230 330 228 370 L220 480 C220 515 185 525 150 525 C115 525 80 515 80 480 L72 370 C70 330 70 230 72 190 Z"
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="2.5"
            />

            {/* Paragolpe Delantero */}
            <path
              d="M90 55 C110 47 190 47 210 55"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Ópticas delanteras */}
            <polygon points="90,65 110,60 105,78 88,75" fill="#38bdf8" opacity="0.8" />
            <polygon points="210,65 190,60 195,78 212,75" fill="#38bdf8" opacity="0.8" />

            {/* Capot y nervaduras */}
            <path d="M105 85 L115 150 M195 85 L185 150" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M115 150 C130 155 170 155 185 150" stroke="#475569" strokeWidth="1.5" />

            {/* Parabrisas delantero */}
            <path
              d="M92 165 C120 155 180 155 208 165 L202 215 C175 210 125 210 98 215 Z"
              fill="#0ea5e9"
              fillOpacity="0.25"
              stroke="#38bdf8"
              strokeWidth="2"
            />

            {/* Espejos Retrovisores */}
            <path d="M68 180 L52 175 C50 178 50 192 54 195 L68 190 Z" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
            <path d="M232 180 L248 175 C250 178 250 192 246 195 L232 190 Z" fill="#334155" stroke="#64748b" strokeWidth="1.5" />

            {/* Techo y Cabina */}
            <rect x="98" y="222" width="104" height="135" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />

            {/* Ventanillas Laterales */}
            <path d="M85 220 L95 224 L95 285 L84 285 Z" fill="#0ea5e9" fillOpacity="0.15" stroke="#475569" strokeWidth="1" />
            <path d="M215 220 L205 224 L205 285 L216 285 Z" fill="#0ea5e9" fillOpacity="0.15" stroke="#475569" strokeWidth="1" />
            <path d="M84 295 L95 295 L95 355 L85 360 Z" fill="#0ea5e9" fillOpacity="0.15" stroke="#475569" strokeWidth="1" />
            <path d="M216 295 L205 295 L205 355 L215 360 Z" fill="#0ea5e9" fillOpacity="0.15" stroke="#475569" strokeWidth="1" />

            {/* Puertas Conductor y Acompañante */}
            <line x1="72" y1="288" x2="84" y2="288" stroke="#64748b" strokeWidth="2" />
            <line x1="216" y1="288" x2="228" y2="288" stroke="#64748b" strokeWidth="2" />

            {/* Luneta Trasera */}
            <path
              d="M100 365 C125 360 175 360 200 365 L206 410 C175 418 125 418 94 410 Z"
              fill="#0ea5e9"
              fillOpacity="0.25"
              stroke="#38bdf8"
              strokeWidth="2"
            />

            {/* Baúl / Portón trasero */}
            <path d="M100 425 C125 432 175 432 200 425 L198 480 C175 490 125 490 102 480 Z" stroke="#475569" strokeWidth="1.5" />

            {/* Faros Traseros */}
            <polygon points="90,480 110,482 105,498 88,495" fill="#ef4444" opacity="0.9" />
            <polygon points="210,480 190,482 195,498 212,495" fill="#ef4444" opacity="0.9" />

            {/* Paragolpe Trasero */}
            <path
              d="M92 510 C115 520 185 520 208 510"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          {/* Marcadores (Pins) colocados en el Vehículo */}
          {pins.map((pin, index) => {
            const info = TIPO_DANIO_INFO[pin.tipo] || TIPO_DANIO_INFO.RAYON;
            return (
              <button
                key={pin.id || index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePin(pin);
                }}
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white shadow-lg cursor-pointer transition-transform hover:scale-125 focus:outline-none ring-2 ring-white/90 ${info.color}`}
                title={`#${index + 1}: ${info.label}`}
              >
                <span className="relative z-10">{index + 1}</span>
                <span className={`absolute -inset-1 rounded-full animate-ping opacity-60 ${info.color}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal / Sheet Flotante para Asignar Tipo de Daño al hacer Tap */}
      {pendingCoords && !readOnly && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                  #{pins.length + 1}
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                    Registrar Daño / Anomalía
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {estimateZone(pendingCoords.x, pendingCoords.y)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Tipo de Daño */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Tipo de Daño:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(TIPO_DANIO_INFO) as DamagePin["tipo"][]).map((tipo) => {
                  const item = TIPO_DANIO_INFO[tipo];
                  const isSelected = selectedTipo === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setSelectedTipo(tipo)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                        isSelected
                          ? `${item.color} text-white ${item.border} shadow-sm`
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className="text-[11px] leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severidad */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Severidad:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {(["LEVE", "MODERADO", "GRAVE"] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSelectedSeveridad(sev)}
                    className={`py-1.5 rounded-lg font-bold border transition-colors ${
                      selectedSeveridad === sev
                        ? sev === "GRAVE"
                          ? "bg-rose-600 text-white border-rose-600"
                          : sev === "MODERADO"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción opcional */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Detalle del daño (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. Rayón de 10cm, abolladura por estacionamiento..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePin}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Guardar Pin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver / eliminar Pin existente */}
      {activePin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                    TIPO_DANIO_INFO[activePin.tipo]?.color || "bg-slate-700"
                  }`}
                >
                  {pins.findIndex((p) => p.id === activePin.id) + 1}
                </span>
                <span className="font-bold text-sm text-slate-900">
                  {TIPO_DANIO_INFO[activePin.tipo]?.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePin(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-slate-500 font-medium">
                Zona: <strong>{estimateZone(activePin.x, activePin.y)}</strong>
              </div>
              <div className="text-slate-500">
                Coordenadas relativas: <code className="font-mono text-[11px]">X: {activePin.x}% • Y: {activePin.y}%</code>
              </div>
              {activePin.severidad && (
                <div className="text-slate-500">
                  Severidad: <span className="font-bold">{activePin.severidad}</span>
                </div>
              )}
              {activePin.descripcion && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic text-[11px] mt-2">
                  &ldquo;{activePin.descripcion}&rdquo;
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePin(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDeletePin(activePin.id)}
                  className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Pin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Listado de Marcadores debajo del Auto */}
      {pins.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Detalle de Daños Asentados ({pins.length}):
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {pins.map((pin, idx) => {
              const info = TIPO_DANIO_INFO[pin.tipo] || TIPO_DANIO_INFO.RAYON;
              return (
                <div
                  key={pin.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200 text-xs shadow-sm hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={`w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center shrink-0 ${info.color}`}
                    >
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block truncate">
                        {info.icon} {pin.descripcion || info.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        X: {pin.x}% | Y: {pin.y}% • {estimateZone(pin.x, pin.y)}
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeletePin(pin.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                      title="Eliminar daño"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
