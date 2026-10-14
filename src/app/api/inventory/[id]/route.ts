import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
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

    if (session.role === "MECHANIC" || session.role === "MECANICO") {
      return NextResponse.json(
        { error: "Los mecánicos no tienen permisos para modificar el inventario" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    const currentItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!currentItem) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.nombre !== undefined) dataToUpdate.nombre = body.nombre;
    if (body.codigo !== undefined) dataToUpdate.codigo = body.codigo ? body.codigo.toUpperCase().trim() : null;
    if (body.categoria !== undefined) dataToUpdate.categoria = body.categoria;
    if (body.stock !== undefined) dataToUpdate.stock = parseInt(body.stock, 10);
    if (body.stockMinimo !== undefined) dataToUpdate.stockMinimo = parseInt(body.stockMinimo, 10);
    if (body.costo !== undefined) dataToUpdate.costo = parseFloat(body.costo);
    if (body.precioVenta !== undefined) dataToUpdate.precioVenta = parseFloat(body.precioVenta);

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: dataToUpdate,
    });

    await recordAuditLog({
      user: session,
      accion: "UPDATE",
      entidad: "Inventory",
      entidadAfectada: "Inventory",
      entidadId: id,
      detallesCambio: {
        anterior: currentItem,
        nuevo: updated,
        descripcion: `Actualización de repuesto en inventario '${updated.nombre}' (Stock: ${updated.stock})`,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("Error en PATCH /api/inventory/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar repuesto en inventario" },
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
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role === "MECHANIC" || session.role === "MECANICO") {
      return NextResponse.json(
        { error: "Los mecánicos no tienen permisos para eliminar repuestos del inventario" },
        { status: 403 }
      );
    }

    const { id } = params;

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }

    await prisma.inventoryItem.delete({
      where: { id },
    });

    await recordAuditLog({
      user: session,
      accion: "DELETE",
      entidad: "Inventory",
      entidadAfectada: "Inventory",
      entidadId: id,
      detallesCambio: {
        eliminado: existing,
        descripcion: `Eliminación de repuesto del inventario: '${existing.nombre}' (${existing.codigo || "Sin código"})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en DELETE /api/inventory/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar repuesto del inventario" },
      { status: 500 }
    );
  }
}
