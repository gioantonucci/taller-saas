import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { recalculateWorkOrderBudget } from "@/lib/budget";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role === "MECANICO" || session.role === "MECHANIC") {
      return NextResponse.json(
        { error: "Los mecánicos no tienen acceso a la gestión de costos de repuestos" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.estado === "ENTREGADO" || order.estado === "ARCHIVADO") {
      return NextResponse.json(
        { error: "No se pueden agregar repuestos porque la orden ya se encuentra cerrada" },
        { status: 400 }
      );
    }

    // Soporte para carga masiva (Bulk) desde extracción OCR
    if (Array.isArray(body.items) && body.items.length > 0) {
      const createdParts = [];
      for (const item of body.items) {
        if (!item.nombreRepuesto) continue;
        const parsedCosto = parseFloat(item.costo) || 0;
        const parsedPrecioVenta = parseFloat(item.precioVenta) || Math.round(parsedCosto * 1.4);
        const parsedCantidad = parseInt(item.cantidad, 10) || 1;

        const part = await prisma.part.create({
          data: {
            workOrderId: id,
            nombreRepuesto: item.nombreRepuesto.trim(),
            codigo: item.codigo?.trim() || null,
            cantidad: parsedCantidad,
            costo: parsedCosto,
            precioVenta: parsedPrecioVenta,
            archivoFacturaURL: body.archivoFacturaURL || item.archivoFacturaURL || null,
          },
        });
        createdParts.push(part);
      }

      // Recalcular presupuesto con fórmula oficial (Mano de obra hs * valorHora + Repuestos)
      const budgetSummary = await recalculateWorkOrderBudget(id);

      // Auditoría
      await recordAuditLog({
        user: session,
        accion: "CREATE",
        entidadAfectada: "Parts",
        entidadId: id,
        detallesCambio: {
          itemsCargados: createdParts.length,
          facturaUrl: body.archivoFacturaURL,
          nuevoTotal: budgetSummary.totalPresupuesto,
          descripcion: `Carga masiva (OCR) de ${createdParts.length} repuestos en Orden #${order.numeroOrden}`,
        },
      });

      return NextResponse.json({
        success: true,
        parts: createdParts,
        ...budgetSummary,
      });
    }

    // Carga individual tradicional (manual o desde Inventario)
    const { nombreRepuesto, codigo, cantidad = 1, costo, precioVenta, archivoFacturaURL, inventoryItemId } = body;

    if (!nombreRepuesto) {
      return NextResponse.json({ error: "El nombre del repuesto es obligatorio" }, { status: 400 });
    }

    const parsedCosto = parseFloat(costo) || 0;
    const parsedPrecioVenta = parseFloat(precioVenta) || Math.round(parsedCosto * 1.4);
    const parsedCantidad = parseInt(cantidad, 10) || 1;

    // Si viene vinculado desde Inventario, validar y descontar stock
    if (inventoryItemId) {
      const invItem = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (invItem) {
        if (invItem.stock < parsedCantidad) {
          return NextResponse.json(
            { error: `Stock insuficiente en inventario. Disponible: ${invItem.stock}, solicitado: ${parsedCantidad}` },
            { status: 400 }
          );
        }
        await prisma.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { stock: { decrement: parsedCantidad } },
        });
      }
    }

    const part = await prisma.part.create({
      data: {
        workOrderId: id,
        inventoryItemId: inventoryItemId || null,
        nombreRepuesto: nombreRepuesto.trim(),
        codigo: codigo?.trim() || null,
        cantidad: parsedCantidad,
        costo: parsedCosto,
        precioVenta: parsedPrecioVenta,
        archivoFacturaURL: archivoFacturaURL || null,
      },
    });

    // Recalcular presupuesto con fórmula oficial
    const budgetSummary = await recalculateWorkOrderBudget(id);

    // Auditoría
    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidadAfectada: "Parts",
      entidadId: part.id,
      detallesCambio: {
        nuevo: {
          repuesto: nombreRepuesto,
          costo: parsedCosto,
          precioVenta: parsedPrecioVenta,
          cantidad: parsedCantidad,
          ordenId: id,
        },
        descripcion: `Agregado de repuesto "${nombreRepuesto}" a la Orden #${order.numeroOrden}`,
      },
    });

    return NextResponse.json({
      success: true,
      part,
      ...budgetSummary,
    });
  } catch (error: any) {
    console.error("Error en POST /api/work-orders/[id]/parts:", error);
    return NextResponse.json(
      { error: "Error al agregar el repuesto a la orden" },
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

    if (session.role === "MECANICO" || session.role === "MECHANIC") {
      return NextResponse.json(
        { error: "Sin permisos para eliminar repuestos" },
        { status: 403 }
      );
    }

    const { id } = params;

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.estado === "ENTREGADO" || order.estado === "ARCHIVADO") {
      return NextResponse.json(
        { error: "No se pueden eliminar repuestos porque la orden ya se encuentra cerrada" },
        { status: 400 }
      );
    }
    const { searchParams } = new URL(request.url);
    let partId = searchParams.get("partId");

    if (!partId) {
      try {
        const body = await request.json();
        partId = body.partId;
      } catch {}
    }

    if (!partId) {
      return NextResponse.json({ error: "ID del repuesto no especificado" }, { status: 400 });
    }

    const existingPart = await prisma.part.findUnique({
      where: { id: partId },
      include: { workOrder: true },
    });

    if (!existingPart || existingPart.workOrderId !== id) {
      return NextResponse.json({ error: "Repuesto no encontrado en esta orden" }, { status: 404 });
    }

    // Si el repuesto vino de inventario, restituir stock
    if (existingPart.inventoryItemId) {
      await prisma.inventoryItem.update({
        where: { id: existingPart.inventoryItemId },
        data: { stock: { increment: existingPart.cantidad } },
      }).catch((e) => console.warn("No se pudo restituir stock:", e));
    }

    await prisma.part.delete({ where: { id: partId } });

    // Recalcular presupuesto tras eliminar
    const budgetSummary = await recalculateWorkOrderBudget(id);

    // Auditoría
    await recordAuditLog({
      user: session,
      accion: "DELETE",
      entidadAfectada: "Parts",
      entidadId: partId,
      detallesCambio: {
        eliminado: existingPart,
        nuevoTotal: budgetSummary.totalPresupuesto,
        descripcion: `Eliminación de repuesto "${existingPart.nombreRepuesto}" en Orden #${existingPart.workOrder.numeroOrden}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Repuesto eliminado correctamente",
      ...budgetSummary,
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/work-orders/[id]/parts:", error);
    return NextResponse.json(
      { error: "Error al eliminar repuesto" },
      { status: 500 }
    );
  }
}
