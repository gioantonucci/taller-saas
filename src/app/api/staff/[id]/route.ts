import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CLOSED_STATES = [
  "FINALIZADO",
  "REPARADO",
  "TERMINADO",
  "ENTREGADO",
  "ARCHIVADO",
  "CANCELADO",
  "CANCELADA",
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para administradores" },
        { status: 403 }
      );
    }

    const { id } = params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        status: true,
        creadoEn: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Buscar órdenes activas asignadas a este usuario (si es mecánico)
    const activeOrders = await prisma.workOrder.findMany({
      where: {
        mechanicId: id,
        estado: { notIn: CLOSED_STATES },
      },
      select: {
        id: true,
        numeroOrden: true,
        estado: true,
        vehicle: {
          select: {
            patente: true,
            marca: true,
            modelo: true,
          },
        },
      },
      orderBy: { numeroOrden: "desc" },
    });

    return NextResponse.json({
      success: true,
      user,
      activeOrders,
    });
  } catch (error: any) {
    console.error("Error en GET /api/staff/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener información del miembro de personal" },
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

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para administradores" },
        { status: 403 }
      );
    }

    const { id } = params;

    if (id === session.id) {
      return NextResponse.json(
        { error: "No puedes modificar o dar de baja tu propia cuenta de administrador" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "No se puede dar de baja a un Administrador del sistema" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const dataToUpdate: any = {};

    if (body.status !== undefined) {
      if (body.status !== "ACTIVE" && body.status !== "INACTIVE") {
        return NextResponse.json(
          { error: "Estado inválido. Debe ser ACTIVE o INACTIVE" },
          { status: 400 }
        );
      }
      dataToUpdate.status = body.status;
    }

    if (body.nombre !== undefined && typeof body.nombre === "string" && body.nombre.trim().length >= 2) {
      dataToUpdate.nombre = body.nombre.trim();
    }

    if (body.apellido !== undefined) {
      dataToUpdate.apellido = typeof body.apellido === "string" && body.apellido.trim() ? body.apellido.trim() : null;
    }

    if (body.password && typeof body.password === "string" && body.password.length >= 6) {
      dataToUpdate.passwordHash = await hashPassword(body.password);
    }

    const isBaja = body.status === "INACTIVE";
    let reassignedInfo = "";

    // Si se está dando de baja, procesar la reasignación de sus órdenes activas
    if (isBaja) {
      const activeOrders = await prisma.workOrder.findMany({
        where: {
          mechanicId: id,
          estado: { notIn: CLOSED_STATES },
        },
        select: {
          id: true,
          numeroOrden: true,
        },
      });

      if (activeOrders.length > 0) {
        const orderIds = activeOrders.map((o) => o.id);
        const orderNums = activeOrders.map((o) => `#${o.numeroOrden}`).join(", ");

        if (body.reasignacion === "MECANICO" && body.nuevoMecanicoId) {
          const nuevoMecanico = await prisma.user.findFirst({
            where: {
              id: body.nuevoMecanicoId,
              role: { in: ["MECHANIC", "MECANICO"] },
              status: "ACTIVE",
            },
          });

          if (!nuevoMecanico) {
            return NextResponse.json(
              { error: "El mecánico de destino para la reasignación no es válido o está inactivo" },
              { status: 400 }
            );
          }

          await prisma.workOrder.updateMany({
            where: { id: { in: orderIds } },
            data: { mechanicId: nuevoMecanico.id },
          });

          reassignedInfo = `${activeOrders.length} órdenes (${orderNums}) reasignadas al mecánico ${nuevoMecanico.nombre} ${nuevoMecanico.apellido || ""}`;
        } else if (body.reasignacion === "SIN_ASIGNAR") {
          await prisma.workOrder.updateMany({
            where: { id: { in: orderIds } },
            data: { mechanicId: null },
          });

          reassignedInfo = `${activeOrders.length} órdenes (${orderNums}) quedaron sin asignar`;
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        status: true,
        creadoEn: true,
        updatedAt: true,
      },
    });

    const isReactivacion = body.status === "ACTIVE";
    const rolLabel = user.role === "MECHANIC" || user.role === "MECANICO" ? "Mecánico" : "Recepción";

    await recordAuditLog({
      user: session,
      accion: isBaja ? "SOFT_DELETE" : isReactivacion ? "STATUS_CHANGE" : "UPDATE",
      entidadAfectada: "Users",
      entidadId: id,
      detallesCambio: {
        descripcion: isBaja
          ? `Baja de personal: ${user.nombre} ${user.apellido || ""} (${rolLabel})${reassignedInfo ? `. Reasignación: ${reassignedInfo}` : ""}`
          : isReactivacion
          ? `Reactivación de personal: ${user.nombre} ${user.apellido || ""} (${rolLabel})`
          : `Actualización de datos de personal: ${user.nombre} ${user.apellido || ""}`,
        estadoAnterior: user.status,
        nuevoEstado: updatedUser.status,
        reasignacion: reassignedInfo || null,
        cambios: {
          status: body.status,
          nombreModificado: Boolean(body.nombre),
          passwordModificada: Boolean(body.password),
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      reasignacion: reassignedInfo || null,
    });
  } catch (error: any) {
    console.error("Error en PATCH /api/staff/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar el estado del personal" },
      { status: 500 }
    );
  }
}
