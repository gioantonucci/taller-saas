import { SparePartStatus, SparePartItem, SparePartPhoto } from "@/types";

/**
 * Parámetros configurables según la especificación del sistema de pedidos de repuestos.
 * Se definen de forma centralizada para que sean modificables sin dispersión de lógica.
 */
export const SPARE_PARTS_CONFIG = {
  // Intervalo entre recordatorios/preguntas periódicas a Recepción (en minutos)
  RECORDATORIO_INTERVALO_MINUTOS: 30,

  // Tiempo límite para que Recepción realice el encargo antes de marcar en rojo y avisar al Admin (en horas)
  ESCALAMIENTO_HORAS: 4,

  // Intervalo de consulta periódica al servidor desde el frontend (en milisegundos)
  POLLING_INTERVAL_MS: 60 * 1000,
};

export interface SparePartStatusInfo {
  label: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
  description: string;
}

export const SPARE_PART_STATUS_MAP: Record<string, SparePartStatusInfo> = {
  SOLICITADO: {
    label: "Pendiente Admin",
    badgeClass: "bg-cyan-50 text-cyan-900 border-cyan-300 ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-300",
    dotClass: "bg-cyan-500",
    description: "El mecánico solicitó repuestos. El Administrador debe revisar o editar la lista y pasarla a Recepción",
  },
  PARA_ENCARGAR: {
    label: "Para Encargar",
    badgeClass: "bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-500/20",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    description: "Lista aprobada por el Administrador. Recepción debe realizar el encargo al proveedor",
  },
  DEVUELTO: {
    label: "Devuelto al Mecánico",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-300 ring-1 ring-rose-500/20",
    borderClass: "border-rose-300",
    dotClass: "bg-rose-500",
    description: "Devuelto al mecánico con observaciones para su corrección y reenvío",
  },
  ENCARGO_REALIZADO: {
    label: "Encargado",
    badgeClass: "bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-500/20",
    borderClass: "border-blue-300",
    dotClass: "bg-blue-500",
    description: "Recepción ya realizó el encargo al proveedor. En espera de entrega en taller",
  },
  RECIBIDO: {
    label: "Recibido en Taller",
    badgeClass: "bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-500/20",
    borderClass: "border-emerald-300",
    dotClass: "bg-emerald-500",
    description: "Repuestos recibidos y verificados en el taller. La reparación técnica puede reanudarse",
  },
  CANCELADO: {
    label: "Cancelado",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/20",
    borderClass: "border-slate-300",
    dotClass: "bg-slate-500",
    description: "Pedido de repuestos cancelado con motivo justificado",
  },
  // Retrocompatibilidad con estados previos (mapean a Pendiente Admin)
  EN_REVISION: {
    label: "Pendiente Admin",
    badgeClass: "bg-cyan-50 text-cyan-900 border-cyan-300 ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-300",
    dotClass: "bg-cyan-500",
    description: "El mecánico solicitó repuestos. El Administrador debe revisar o editar la lista y pasarla a Recepción",
  },
  PENDIENTE_ADMIN: {
    label: "Pendiente Admin",
    badgeClass: "bg-cyan-50 text-cyan-900 border-cyan-300 ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-300",
    dotClass: "bg-cyan-500",
    description: "Pendiente de revisión del Administrador",
  },
  PROCESADO_ADMIN: {
    label: "Para Encargar",
    badgeClass: "bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-500/20",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    description: "Para encargar en Recepción",
  },
  RECIBIDO_PARCIAL: {
    label: "Encargado",
    badgeClass: "bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-500/20",
    borderClass: "border-blue-300",
    dotClass: "bg-blue-500",
    description: "En espera de repuestos",
  },
  RECIBIDO_TOTAL: {
    label: "Recibido en Taller",
    badgeClass: "bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-500/20",
    borderClass: "border-emerald-300",
    dotClass: "bg-emerald-500",
    description: "Recibido en taller",
  },
};

/**
 * Normaliza el estado para asegurar compatibilidad
 */
export function normalizeSparePartStatus(status: string): SparePartStatus {
  if (status === "PENDIENTE_ADMIN" || status === "EN_REVISION") return "SOLICITADO";
  if (status === "PROCESADO_ADMIN") return "PARA_ENCARGAR";
  if (status === "RECIBIDO_PARCIAL") return "ENCARGO_REALIZADO";
  if (status === "RECIBIDO_TOTAL") return "RECIBIDO";
  return (status as SparePartStatus) || "SOLICITADO";
}

export function getSparePartStatusInfo(status: string): SparePartStatusInfo {
  const norm = normalizeSparePartStatus(status);
  return (
    SPARE_PART_STATUS_MAP[status] ||
    SPARE_PART_STATUS_MAP[norm] ||
    SPARE_PART_STATUS_MAP.SOLICITADO
  );
}

/**
 * Determina si un pedido está demorado por tiempo excesivo de espera:
 * Regla: Solo está demorado si recepción no lo encargó ('PARA_ENCARGAR' por más de 4 horas).
 * Una vez encargado por recepción, ya no se considera demorado.
 */
export function isSparePartEscalated(req: {
  estado: string;
  fechaRevision?: string | Date | null;
  fechaEncargo?: string | Date | null;
  fechaEstimadaLlegada?: string | Date | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
}): boolean {
  const estado = normalizeSparePartStatus(req.estado);

  // Solo está demorado si recepción no lo encargó (estado PARA_ENCARGAR)
  if (estado !== "PARA_ENCARGAR") return false;

  const baseDate = req.fechaRevision
    ? new Date(req.fechaRevision)
    : req.updatedAt
    ? new Date(req.updatedAt)
    : req.createdAt
    ? new Date(req.createdAt)
    : new Date();

  const elapsedMs = Date.now() - baseDate.getTime();
  const limitMs = SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS * 60 * 60 * 1000;
  return elapsedMs > limitMs;
}

/**
 * Determina si un pedido en 'ENCARGO_REALIZADO' tiene la fecha estimada de llegada vencida
 */
export function isLlegadaVencida(req: {
  estado: string;
  fechaEstimadaLlegada?: string | Date | null;
}): boolean {
  const estado = normalizeSparePartStatus(req.estado);
  if (estado !== "ENCARGO_REALIZADO") return false;
  if (!req.fechaEstimadaLlegada) return false;

  const estimada = new Date(req.fechaEstimadaLlegada);
  return estimada.getTime() < Date.now();
}

/**
 * Obtiene la fecha del último cambio de estado del pedido de repuestos
 */
export function getFechaUltimoEstado(req: {
  estado: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  fechaRevision?: string | Date | null;
  fechaEncargo?: string | Date | null;
  fechaRecepcion?: string | Date | null;
  fechaCancelacion?: string | Date | null;
}): Date {
  const norm = normalizeSparePartStatus(req.estado);

  if (norm === "CANCELADO" && req.fechaCancelacion) {
    return new Date(req.fechaCancelacion);
  }
  if (norm === "RECIBIDO" && req.fechaRecepcion) {
    return new Date(req.fechaRecepcion);
  }
  if (norm === "ENCARGO_REALIZADO" && req.fechaEncargo) {
    return new Date(req.fechaEncargo);
  }
  if (norm === "PARA_ENCARGAR" && req.fechaRevision) {
    return new Date(req.fechaRevision);
  }
  if (norm === "DEVUELTO" && req.fechaRevision) {
    return new Date(req.fechaRevision);
  }

  // Si no está en SOLICITADO y tiene updatedAt, usar updatedAt
  if (norm !== "SOLICITADO" && req.updatedAt) {
    return new Date(req.updatedAt);
  }

  return req.createdAt ? new Date(req.createdAt) : new Date();
}

/**
 * Calcula el tiempo transcurrido en formato amigable
 */
export function formatTiempoTranscurrido(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "Recién";
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Parsea de manera segura listas de repuestos (JSON string, array o texto plano)
 */
export function parseSparePartItems(raw: any, fallbackText?: string | null): SparePartItem[] {
  if (Array.isArray(raw)) {
    return raw.map((it, idx) => ({
      id: it.id || `item-${idx}`,
      descripcion: (it.descripcion || it.nombre || "").trim(),
      cantidad: Math.max(1, Number(it.cantidad) || 1),
    }));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          descripcion: (it.descripcion || it.nombre || "").trim(),
          cantidad: Math.max(1, Number(it.cantidad) || 1),
        }));
      }
    } catch {}
  }
  if (fallbackText && typeof fallbackText === "string" && fallbackText.trim()) {
    return fallbackText
      .split("\n")
      .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean)
      .map((l, idx) => ({
        id: `item-${idx}`,
        descripcion: l,
        cantidad: 1,
      }));
  }
  return [];
}

/**
 * Parsea de manera segura fotografías con notas ancladas
 */
export function parseSparePartPhotos(raw: any, fallbackUrl?: string | null): SparePartPhoto[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  if (fallbackUrl) {
    return [
      {
        id: "foto-0",
        url: fallbackUrl,
        nota: "Foto inicial de evidencia",
        fecha: new Date().toISOString(),
      },
    ];
  }
  return [];
}
