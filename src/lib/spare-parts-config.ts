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
    label: "Solicitado",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-300",
    dotClass: "bg-cyan-500",
    description: "Pedido creado por el mecánico, pendiente de toma por el Administrador",
  },
  EN_REVISION: {
    label: "En revisión",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-500/20",
    borderClass: "border-purple-300",
    dotClass: "bg-purple-500",
    description: "Tomado por el Administrador para definir la lista definitiva a encargar",
  },
  PARA_ENCARGAR: {
    label: "Para encargar",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-500/20",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    description: "Lista aprobada por el Administrador, esperando que Recepción realice el encargo",
  },
  DEVUELTO: {
    label: "Devuelto",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20",
    borderClass: "border-rose-300",
    dotClass: "bg-rose-500",
    description: "Devuelto al mecánico con observaciones para su corrección y reenvío",
  },
  ENCARGO_REALIZADO: {
    label: "Encargo realizado",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20",
    borderClass: "border-blue-300",
    dotClass: "bg-blue-500",
    description: "Encargo efectuado por Recepción al proveedor, esperando llegada de piezas",
  },
  RECIBIDO: {
    label: "Recibido",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20",
    borderClass: "border-emerald-300",
    dotClass: "bg-emerald-500",
    description: "Repuestos recibidos en el taller, listo para reanudar la reparación",
  },
  CANCELADO: {
    label: "Cancelado",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/20",
    borderClass: "border-slate-300",
    dotClass: "bg-slate-500",
    description: "Pedido cancelado con motivo registrado",
  },
  // Retrocompatibilidad con estados previos si existieran registros antiguos
  PENDIENTE_ADMIN: {
    label: "Solicitado",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-300",
    dotClass: "bg-cyan-500",
    description: "Pendiente de revisión",
  },
  PROCESADO_ADMIN: {
    label: "Para encargar",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-500/20",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    description: "Para encargar",
  },
  RECIBIDO_PARCIAL: {
    label: "Encargo realizado",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20",
    borderClass: "border-blue-300",
    dotClass: "bg-blue-500",
    description: "En espera de repuestos",
  },
  RECIBIDO_TOTAL: {
    label: "Recibido",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20",
    borderClass: "border-emerald-300",
    dotClass: "bg-emerald-500",
    description: "Recibido",
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
