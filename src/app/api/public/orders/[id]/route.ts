import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = decodeURIComponent(params.id || "").trim();
    if (!rawId) {
      return NextResponse.json(
        { error: "Identificador de orden o matrícula requerido." },
        { status: 400 }
      );
    }

    const selectClause = {
      id: true,
      numeroOrden: true,
      estado: true,
      fechaIngreso: true,
      fechaEstimada: true,
      fechaEntrega: true,
      nivelNafta: true,
      kilometraje: true,
      detallesIngreso: true,
      vehicle: {
        select: {
          marca: true,
          modelo: true,
          anio: true,
          patente: true,
          color: true,
          client: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },
      },
      multimedia: {
        select: {
          id: true,
          urlStorage: true,
          descripcion: true,
          etiqueta: true,
          fechaCarga: true,
        },
        orderBy: {
          fechaCarga: "desc" as const,
        },
      },
    };

    let order = null;
    const isNumeric = /^\d+$/.test(rawId);

    if (isNumeric) {
      // Búsqueda por número de orden exacto
      order = await prisma.workOrder.findFirst({
        where: { numeroOrden: parseInt(rawId, 10) },
        select: selectClause,
      });
    }

    // Si no encontró o no era numérico, buscar por ID directo de la orden
    if (!order) {
      order = await prisma.workOrder.findFirst({
        where: { id: rawId },
        select: selectClause,
      });
    }

    // Si aún no encontró, buscar por matrícula / patente del vehículo
    if (!order) {
      const cleanPlate = rawId.replace(/[\s\-_]/g, "");
      
      // Buscar vehículo por patente exacta o sin espacios
      const matchingVehicles = await prisma.vehicle.findMany({
        where: {
          OR: [
            { patente: { equals: rawId, mode: "insensitive" } },
            { patente: { contains: cleanPlate, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });

      if (matchingVehicles.length > 0) {
        order = await prisma.workOrder.findFirst({
          where: {
            vehicleId: { in: matchingVehicles.map((v) => v.id) },
          },
          orderBy: { fechaIngreso: "desc" },
          select: selectClause,
        });
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "No se encontró ninguna orden de trabajo con el número de orden o matrícula provista." },
        { status: 404 }
      );
    }

    const publicOrder = {
      id: order.id,
      numeroOrden: order.numeroOrden,
      estado: order.estado,
      fechaIngreso: order.fechaIngreso,
      fechaEstimada: order.fechaEstimada,
      fechaEntrega: order.fechaEntrega,
      nivelNafta: order.nivelNafta,
      kilometraje: order.kilometraje,
      detallesIngreso: order.detallesIngreso || "Revisión técnica general y mantenimiento programado.",
      vehicle: {
        marca: order.vehicle?.marca || "",
        modelo: order.vehicle?.modelo || "",
        anio: order.vehicle?.anio || null,
        patente: order.vehicle?.patente || "",
        color: order.vehicle?.color || "",
        client: {
          nombre: order.vehicle?.client?.nombre || "",
          apellido: order.vehicle?.client?.apellido || "",
        },
      },
      multimedia: order.multimedia || [],
    };

    const settings = await prisma.tenantSettings.findFirst();

    return NextResponse.json({
      success: true,
      order: publicOrder,
      settings: settings || {
        tallerNombre: "POGGI Taller Integral",
        whatsapp: "+34 656 40 62 86",
        direccion: "C. de Sant Pius X, 13, 46017 València, España",
        email: "poggitallerintegral@gmail.com",
        horarios: "Lunes a viernes · 08:00–18:00",
        valorHoraManoDeObra: 45,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/public/orders/[id]:", error);
    return NextResponse.json(
      { error: "Error al consultar el estado de la orden" },
      { status: 500 }
    );
  }
}
