import { SparePartStatus } from "@/types";

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
  EN_REVISION: {
    label: "En Revisión (Admin)",
    badgeClass: "bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-500/20",
    borderClass: "border-purple-300",
    dotClass: "bg-purple-500",
    description: "El Administrador está revisando y editando la lista de repuestos",
  },
  PARA_ENCARGAR: {
    label: "Para Encargar (Recepción)",
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
    label: "Encargado (En Tránsito)",
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
  // Retrocompatibilidad con estados previos
  PENDIENTE_ADMIN: {
    label: "Pendiente Admin",
    badgeClass: "bg-cyan-50 text-cyan-900 border-cyan-300 ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-300",
    dotClass: "bg-cyan-500",
    description: "Pendiente de revisión del Administrador",
  },
  PROCESADO_ADMIN: {
    label: "Para Encargar (Recepción)",
    badgeClass: "bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-500/20",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    description: "Para encargar en Recepción",
  },
  RECIBIDO_PARCIAL: {
    label: "Encargado (En Tránsito)",
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
  if (status === "PENDIENTE_ADMIN") return "SOLICITADO";
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
 * Determina si un pedido en 'PARA_ENCARGAR' está escalado (más de 4 horas esperando encargo)
 */
export function isSparePartEscalated(req: {
  estado: string;
  fechaRevision?: string | Date | null;
  updatedAt?: string | Date;
  createdAt?: string | Date;
}): boolean {
  const estado = normalizeSparePartStatus(req.estado);
  if (estado !== "PARA_ENCARGAR") return false;

  // Tomamos como referencia el momento en que pasó a PARA_ENCARGAR (fechaRevision o updatedAt)
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
