import { prisma } from "./prisma";
import { UserSession } from "@/types";

interface AuditLogParams {
  user?: UserSession | null;
  accion: "CREATE" | "UPDATE" | "SOFT_DELETE" | "LOGIN" | "LOGOUT" | "STATUS_CHANGE" | "UPLOAD_MULTIMEDIA" | string;
  entidad?: string;
  entidadAfectada?: "WorkOrders" | "Clients" | "Vehicles" | "Parts" | "Users" | "WorkLogs" | "Multimedia" | "Auth" | string;
  entidadId?: string;
  valores?: any;
  detallesCambio?: {
    anterior?: any;
    nuevo?: any;
    descripcion?: string;
    [key: string]: any;
  } | any;
  ipAddress?: string;
}

export async function recordAuditLog({
  user,
  accion,
  entidad,
  entidadAfectada,
  entidadId,
  valores,
  detallesCambio,
  ipAddress,
}: AuditLogParams) {
  try {
    const targetEntity = entidad || entidadAfectada || "General";
    const changeValues = valores !== undefined ? valores : detallesCambio || {};
    const valuesString = typeof changeValues === "string" ? changeValues : JSON.stringify(changeValues);

    return await prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || "sistema@taller.local",
        userName: user ? `${user.nombre} ${user.apellido || ""}`.trim() : "Sistema Automático",
        accion,
        entidad: targetEntity,
        entidadAfectada: targetEntity,
        entidadId: entidadId || null,
        valores: valuesString,
        detallesCambio: valuesString,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Error al registrar AuditLog:", error);
    return null;
  }
}
