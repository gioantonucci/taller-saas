import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;
    const req = await prisma.sparePartRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: {
            vehicle: {
              include: {
                client: true,
              },
            },
            mechanic: true,
          },
        },
        mechanic: true,
        admin: true,
      },
    });

    if (!req) {
      return NextResponse.json(
        { error: "Solicitud de repuestos no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(req);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar solicitud: " + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;
    const existingReq = await prisma.sparePartRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!existingReq) {
      return NextResponse.json(
        { error: "Solicitud de repuestos no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    // 1. Procesamiento por parte del Administrador
    if (body.action === "PROCESAR_ADMIN" || body.itemsProcesados !== undefined) {
      updateData.itemsProcesados =
        typeof body.itemsProcesados === "string"
          ? body.itemsProcesados
          : JSON.stringify(body.itemsProcesados || []);
      
      if (body.proveedor !== undefined) {
        updateData.proveedor = body.proveedor?.trim() || null;
      }
      if (body.notasAdmin !== undefined) {
        updateData.notasAdmin = body.notasAdmin?.trim() || null;
      }

      updateData.adminId = session.id;
      updateData.fechaProcesado = new Date();
      updateData.estado = body.estado || "PROCESADO_ADMIN";
    }

    // 2. Control de Recepción
    if (body.action === "RECEPCIONAR" || body.recibirItems !== undefined) {
      if (body.itemsProcesados !== undefined) {
        updateData.itemsProcesados =
          typeof body.itemsProcesados === "string"
            ? body.itemsProcesados
            : JSON.stringify(body.itemsProcesados);
      }
      if (body.remitoNro !== undefined) {
        updateData.remitoNro = body.remitoNro?.trim() || null;
      }
      if (body.notasRecepcion !== undefined) {
        updateData.notasRecepcion = body.notasRecepcion?.trim() || null;
      }

      updateData.recibidoPor = `${session.nombre} ${session.apellido || ""}`.trim();
      updateData.fechaRecepcion = new Date();
      if (body.estado) {
        updateData.estado = body.estado;
      }
    }

    // Actualizaciones directas de estado u otros campos
    if (body.estado && !updateData.estado) {
      updateData.estado = body.estado;
    }

    const updated = await prisma.sparePartRequest.update({
      where: { id },
      data: updateData,
      include: {
        workOrder: {
          include: {
            vehicle: true,
            mechanic: true,
          },
        },
        mechanic: true,
        admin: true,
      },
    });

    // Si recepción o el admin solicitan reactivar la orden a EN_REPARACION
    if (body.reactivarOrden === true && existingReq.workOrderId) {
      await prisma.workOrder.update({
        where: { id: existingReq.workOrderId },
        data: {
          estado: "EN_REPARACION",
          fechaCambioEstado: new Date(),
        },
      });
    }

    // Registrar en auditoría
    await recordAuditLog({
      accion: "UPDATE",
      entidad: "SparePartRequest",
      entidadId: id,
      valores: {
        ordenNumero: existingReq.workOrder?.numeroOrden,
        patente: existingReq.workOrder?.vehicle?.patente,
        estado: updateData.estado || existingReq.estado,
        usuario: `${session.nombre} ${session.apellido || ""}`.trim(),
        accionRealizada: body.action || "UPDATE",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error al actualizar solicitud de repuestos:", error);
    return NextResponse.json(
      { error: "Error al actualizar solicitud: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden eliminar solicitudes de repuestos" },
        { status: 403 }
      );
    }

    const { id } = params;
    await prisma.sparePartRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Solicitud eliminada con éxito" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al eliminar solicitud: " + error.message },
      { status: 500 }
    );
  }
}
