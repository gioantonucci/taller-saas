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

    // Consolidamos valores y detallesCambio para que la base de datos guarde
    // tanto la descripción humana como los datos comparativos (anterior y nuevo)
    let payload: any = {};

    if (typeof valores === "object" && valores !== null) {
      payload = { ...payload, ...valores };
    }

    if (typeof detallesCambio === "object" && detallesCambio !== null) {
      payload = { ...payload, ...detallesCambio };
    } else if (typeof detallesCambio === "string") {
      try {
        const parsed = JSON.parse(detallesCambio);
        if (typeof parsed === "object" && parsed !== null) {
          payload = { ...payload, ...parsed };
        } else {
          payload.descripcion = detallesCambio;
        }
      } catch {
        payload.descripcion = detallesCambio;
      }
    }

    // Preservar anterior y nuevo si venían en valores
    if (valores?.anterior && !payload.anterior) payload.anterior = valores.anterior;
    if (valores?.nuevo && !payload.nuevo) payload.nuevo = valores.nuevo;

    if (Object.keys(payload).length === 0) {
      if (typeof valores === "string") payload = { valor: valores };
      else if (typeof detallesCambio === "string") payload = { descripcion: detallesCambio };
    }

    const payloadString = JSON.stringify(payload);

    return await prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || "sistema@taller.local",
        userName: user ? `${user.nombre} ${user.apellido || ""}`.trim() : "Sistema Automático",
        accion,
        entidad: targetEntity,
        entidadAfectada: targetEntity,
        entidadId: entidadId || null,
        valores: payloadString,
        detallesCambio: payloadString,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Error al registrar AuditLog:", error);
    return null;
  }
}
