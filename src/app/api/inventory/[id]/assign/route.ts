import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
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
    const { workOrderId, cantidad = 1, precioVenta } = body;

    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "La cantidad a vincular debe ser mayor a cero" },
        { status: 400 }
      );
    }

    if (!workOrderId) {
      return NextResponse.json(
        { error: "Debe seleccionar una orden de trabajo (auto) válida" },
        { status: 400 }
      );
    }

    // 1. Obtener repuesto del inventario
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: "El repuesto seleccionado no existe en el inventario" },
        { status: 404 }
      );
    }

    // 2. Validar disponibilidad de stock
    if (inventoryItem.stock < qty) {
      return NextResponse.json(
        {
          error: `Stock insuficiente. Disponible: ${inventoryItem.stock} unidades, intentando usar: ${qty}.`,
        },
        { status: 400 }
      );
    }

    // 3. Obtener la orden de trabajo y verificar que esté abierta
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        vehicle: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "La orden de trabajo seleccionada no existe" },
        { status: 404 }
      );
    }

    if (workOrder.estado === "FINALIZADO" || workOrder.estado === "TERMINADO" || workOrder.estado === "REPARADO") {
      return NextResponse.json(
        { error: "No se pueden imputar repuestos a una orden que ya está finalizada y cerrada" },
        { status: 400 }
      );
    }

    const unitPrice = parseFloat(precioVenta) || inventoryItem.precioVenta;

    // 4. TRANSACCIÓN: Descontar stock del inventario y crear el repuesto en la orden del auto
    const [updatedInventory, newPart] = await prisma.$transaction([
      // Descontar stock del inventario
      prisma.inventoryItem.update({
        where: { id },
        data: {
          stock: {
            decrement: qty,
          },
        },
      }),

      // Asignar a la orden de trabajo del vehículo
      prisma.part.create({
        data: {
          workOrderId,
          inventoryItemId: inventoryItem.id,
          nombreRepuesto: inventoryItem.nombre,
          codigo: inventoryItem.codigo,
          cantidad: qty,
          costo: inventoryItem.costo,
          precioVenta: unitPrice,
          archivoFacturaURL: inventoryItem.archivoFacturaURL,
        },
      }),
    ]);

    // 5. Recalcular totalPresupuesto de la Orden
    const allParts = await prisma.part.findMany({
      where: { workOrderId },
    });

    const totalPartsCost = allParts.reduce(
      (sum, p) => sum + (p.precioVenta * p.cantidad),
      0
    );

    const totalPresupuesto = (workOrder.costoManoDeObra || 0) + totalPartsCost;

    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { totalPresupuesto },
    });

    // 6. Registro de Auditoría
    await recordAuditLog({
      user: session,
      accion: "UPDATE",
      entidad: "Inventory",
      entidadAfectada: "Inventory",
      entidadId: inventoryItem.id,
      detallesCambio: {
        repuestoId: inventoryItem.id,
        repuestoNombre: inventoryItem.nombre,
        cantidadAsignada: qty,
        stockAnterior: inventoryItem.stock,
        stockNuevo: updatedInventory.stock,
        workOrderId,
        numeroOrden: workOrder.numeroOrden,
        patente: workOrder.vehicle.patente,
        descripcion: `Repuesto '${inventoryItem.nombre}' (${qty} u.) asignado a Orden #${workOrder.numeroOrden} (${workOrder.vehicle.patente}). Stock rebajado a ${updatedInventory.stock} u.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Se vincularon ${qty} unidad(es) de '${inventoryItem.nombre}' a la Orden #${workOrder.numeroOrden} (${workOrder.vehicle.patente}). Stock restante: ${updatedInventory.stock}.`,
      updatedInventory,
      newPart,
      totalPresupuesto,
    });
  } catch (error: any) {
    console.error("Error al vincular repuesto a la orden:", error);
    return NextResponse.json(
      { error: "Error al vincular el repuesto y descontar el stock" },
      { status: 500 }
    );
  }
}
