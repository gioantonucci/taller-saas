export type OrderStatus =
  | "PENDIENTE_PERITAJE"
  | "EN_REPARACION"
  | "EN_ESPERA_REPUESTOS"
  | "FINALIZADO"
  | "ENTREGADO"
  | "CANCELADO";

export interface StatusInfo {
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
}

export const ORDER_STATUS_MAP: Record<string, StatusInfo> = {
  PENDIENTE_PERITAJE: {
    label: "En Peritaje",
    shortLabel: "En Peritaje",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-500/20",
    description: "Vehículo recién ingresado al taller, esperando peritaje y verificación",
  },
  EN_REPARACION: {
    label: "En Reparación",
    shortLabel: "En Reparación",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/20",
    description: "Peritaje de ingreso completado y tareas mecánicas activas en curso",
  },
  EN_ESPERA_REPUESTOS: {
    label: "En Pausa",
    shortLabel: "En Pausa",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-500/20",
    description: "Trabajo en pausa aguardando la llegada de piezas o repuestos",
  },
  FINALIZADO: {
    label: "Listo",
    shortLabel: "Listo",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20",
    description: "Trabajo mecánico concluido y listo para entrega",
  },
  ENTREGADO: {
    label: "Entregado / Archivado",
    shortLabel: "Entregado",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/20",
    description: "Vehículo entregado al cliente conforme y orden archivada",
  },
  CANCELADO: {
    label: "Dada de Baja",
    shortLabel: "Baja / Cancelada",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/20",
    description: "Orden cancelada/dada de baja y archivada con motivo justificado",
  },
};

/**
 * Normaliza y devuelve la información formal del estado con retrocompatibilidad
 */
export function getStatusInfo(status: string): StatusInfo {
  if (status === "PENDIENTE" || status === "PENDIENTE_PERITAJE" || status === "INGRESADO") {
    return ORDER_STATUS_MAP.PENDIENTE_PERITAJE;
  }
  if (status === "EN_CURSO" || status === "EN_REPARACION" || status === "PERITADO") {
    return ORDER_STATUS_MAP.EN_REPARACION;
  }
  if (status === "ESPERANDO_REPUESTOS" || status === "EN_ESPERA_REPUESTOS" || status === "DETENIDO") {
    return ORDER_STATUS_MAP.EN_ESPERA_REPUESTOS;
  }
  if (status === "FINALIZADO" || status === "REPARADO" || status === "TERMINADO") {
    return ORDER_STATUS_MAP.FINALIZADO;
  }
  if (status === "ENTREGADO" || status === "ARCHIVADO") {
    return ORDER_STATUS_MAP.ENTREGADO;
  }
  if (status === "CANCELADO" || status === "CANCELADA" || status === "DADA_DE_BAJA" || status === "BAJA") {
    return ORDER_STATUS_MAP.CANCELADO;
  }
  return {
    label: status,
    shortLabel: status,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    description: status,
  };
}
