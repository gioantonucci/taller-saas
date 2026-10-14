import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Buscar por ID o por numeroOrden numérico
    const isNumeric = /^\d+$/.test(id);
    const whereClause = isNumeric
      ? { numeroOrden: parseInt(id, 10) }
      : { id };

    const order = await prisma.workOrder.findFirst({
      where: whereClause,
      select: {
        numeroOrden: true,
        estado: true,
        fechaIngreso: true,
        vehicle: {
          select: {
            marca: true,
            modelo: true,
            patente: true,
            client: {
              select: {
                nombre: true,
              },
            },
          },
        },
        multimedia: {
          select: {
            urlStorage: true,
            descripcion: true,
            etiqueta: true,
            fechaCarga: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "No se encontró ninguna orden de trabajo con el identificador provisto." },
        { status: 404 }
      );
    }

    const publicOrder = {
      numeroOrden: order.numeroOrden,
      estado: order.estado,
      fechaIngreso: order.fechaIngreso,
      vehicle: {
        marca: order.vehicle?.marca || "",
        modelo: order.vehicle?.modelo || "",
        patente: order.vehicle?.patente || "",
        client: {
          nombre: order.vehicle?.client?.nombre ? order.vehicle.client.nombre.trim().split(" ")[0] : "",
        },
      },
      multimedia: order.multimedia || [],
    };

    const settings = await prisma.tenantSettings.findFirst();

    return NextResponse.json({
      success: true,
      order: publicOrder,
      settings: settings || {
        tallerNombre: "Taller Mecánico Central Pro",
        whatsapp: "+54 9 11 4567-8900",
        direccion: "Av. del Libertador 4580, Buenos Aires",
        email: "contacto@tallerpro.com",
        valorHoraManoDeObra: 15000,
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
