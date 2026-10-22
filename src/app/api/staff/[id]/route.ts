import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

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
      include: {
        _count: {
          select: {
            workOrdersMechanic: {
              where: {
                estado: { notIn: ["ENTREGADO", "CANCELADO"] },
              },
            },
          },
        },
      },
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

    const isBaja = body.status === "INACTIVE";
    const isReactivacion = body.status === "ACTIVE";
    const rolLabel = user.role === "MECHANIC" || user.role === "MECANICO" ? "Mecánico" : "Recepción";

    await recordAuditLog({
      user: session,
      accion: isBaja ? "SOFT_DELETE" : isReactivacion ? "STATUS_CHANGE" : "UPDATE",
      entidadAfectada: "Users",
      entidadId: id,
      detallesCambio: {
        descripcion: isBaja
          ? `Baja de personal: ${user.nombre} ${user.apellido || ""} (${rolLabel})`
          : isReactivacion
          ? `Reactivación de personal: ${user.nombre} ${user.apellido || ""} (${rolLabel})`
          : `Actualización de datos de personal: ${user.nombre} ${user.apellido || ""}`,
        estadoAnterior: user.status,
        nuevoEstado: updatedUser.status,
        cambios: {
          status: body.status,
          nombreModificado: Boolean(body.nombre),
          passwordModificada: Boolean(body.password),
        },
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Error en PATCH /api/staff/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar el estado del personal" },
      { status: 500 }
    );
  }
}
