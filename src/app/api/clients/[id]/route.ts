import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { clientFormSchema } from "@/lib/validations";

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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        vehicles: {
          where: { isDeleted: false },
          include: {
            workOrders: {
              orderBy: { fechaIngreso: "desc" },
            },
          },
        },
        transactions: {
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("Error en GET /api/clients/[id]:", error);
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 });
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
    const body = await request.json();

    const currentClient = await prisma.client.findUnique({ where: { id } });
    if (!currentClient) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const isSoftDelete =
      (body.status === "INACTIVE" && currentClient.status !== "INACTIVE") ||
      (body.isDeleted === true && !currentClient.isDeleted);

    if (isSoftDelete) {
      // Ejecución de BAJA LÓGICA (Soft Delete) - NUNCA DELETE físico
      const softDeleted = await prisma.client.update({
        where: { id },
        data: {
          status: "INACTIVE",
          isDeleted: true,
        },
      });

      await recordAuditLog({
        user: session,
        accion: "SOFT_DELETE",
        entidad: "Clients",
        entidadAfectada: "Clients",
        entidadId: id,
        valores: {
          anterior: { status: currentClient.status, isDeleted: currentClient.isDeleted },
          nuevo: { status: "INACTIVE", isDeleted: true },
        },
        detallesCambio: {
          anterior: { status: currentClient.status, isDeleted: currentClient.isDeleted },
          nuevo: { status: "INACTIVE", isDeleted: true },
          descripcion: `Baja lógica (Soft Delete) del cliente ${currentClient.nombre} ${currentClient.apellido} (DNI ${currentClient.dni})`,
        },
      });

      return NextResponse.json({ success: true, client: softDeleted, message: "Cliente dado de baja lógica correctamente" });
    }

    // Actualización de datos con validación Zod parcial
    const updateData: any = {};
    if (body.nombre) updateData.nombre = body.nombre.trim();
    if (body.apellido) updateData.apellido = body.apellido.trim();
    if (body.telefono) updateData.telefono = body.telefono.trim();
    if (body.email !== undefined) updateData.email = body.email.trim();
    if (body.direccion !== undefined) updateData.direccion = body.direccion.trim();
    if (body.dni && body.dni !== currentClient.dni) {
      const cleanDni = body.dni.trim();
      const duplicate = await prisma.client.findUnique({ where: { dni: cleanDni } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: "Ya existe otro cliente con ese DNI" }, { status: 400 });
      }
      updateData.dni = cleanDni;
    }

    const updated = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    const anteriorDiff = {
      nombre: currentClient.nombre,
      apellido: currentClient.apellido,
      dni: currentClient.dni,
      telefono: currentClient.telefono,
      email: currentClient.email,
      direccion: currentClient.direccion,
    };
    const nuevoDiff = {
      nombre: updated.nombre,
      apellido: updated.apellido,
      dni: updated.dni,
      telefono: updated.telefono,
      email: updated.email,
      direccion: updated.direccion,
    };

    await recordAuditLog({
      user: session,
      accion: "UPDATE",
      entidad: "Clients",
      entidadAfectada: "Clients",
      entidadId: id,
      valores: { anterior: anteriorDiff, nuevo: nuevoDiff },
      detallesCambio: {
        anterior: anteriorDiff,
        nuevo: nuevoDiff,
        descripcion: `Actualización de datos del cliente ${currentClient.nombre} ${currentClient.apellido} (DNI ${currentClient.dni})`,
      },
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (error: any) {
    console.error("Error en PATCH /api/clients/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    const currentClient = await prisma.client.findUnique({ where: { id } });
    if (!currentClient) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // NUNCA DELETE físico: Soft Delete
    const softDeleted = await prisma.client.update({
      where: { id },
      data: {
        status: "INACTIVE",
        isDeleted: true,
      },
    });

    await recordAuditLog({
      user: session,
      accion: "SOFT_DELETE",
      entidad: "Clients",
      entidadAfectada: "Clients",
      entidadId: id,
      valores: {
        anterior: { status: currentClient.status, isDeleted: currentClient.isDeleted },
        nuevo: { status: "INACTIVE", isDeleted: true },
      },
      detallesCambio: {
        anterior: { status: currentClient.status, isDeleted: currentClient.isDeleted },
        nuevo: { status: "INACTIVE", isDeleted: true },
        descripcion: `Baja lógica (Soft Delete) del cliente ${currentClient.nombre} ${currentClient.apellido} (DNI ${currentClient.dni})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cliente dado de baja lógica correctamente",
      client: softDeleted,
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/clients/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
