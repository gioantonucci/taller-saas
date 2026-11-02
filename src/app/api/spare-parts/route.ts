import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get("workOrderId");
    const estado = searchParams.get("estado");

    const where: any = {};
    if (workOrderId) {
      where.workOrderId = workOrderId;
    }
    if (estado && estado !== "TODOS") {
      where.estado = estado;
    }

    const requests = await prisma.sparePartRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        workOrder: {
          include: {
            vehicle: {
              include: {
                client: {
                  select: {
                    id: true,
                    nombre: true,
                    apellido: true,
                    telefono: true,
                  },
                },
              },
            },
            mechanic: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
          },
        },
        mechanic: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("Error al obtener solicitudes de repuestos:", error);
    return NextResponse.json(
      { error: "Error interno al obtener solicitudes de repuestos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { workOrderId, fallaReparar, repuestosLista, fotoUrl } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { error: "El ID de la orden de trabajo es obligatorio" },
        { status: 400 }
      );
    }

    if (!fallaReparar || typeof fallaReparar !== "string" || !fallaReparar.trim()) {
      return NextResponse.json(
        { error: "Debe indicar la falla a reparar que motiva la solicitud de repuestos" },
        { status: 400 }
      );
    }

    if (!repuestosLista || typeof repuestosLista !== "string" || !repuestosLista.trim()) {
      return NextResponse.json(
        { error: "Debe indicar los repuestos necesarios" },
        { status: 400 }
      );
    }

    // Verificar que la orden exista
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        vehicle: true,
        mechanic: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    // Crear la solicitud de repuesto en la base de datos
    const sparePartReq = await prisma.sparePartRequest.create({
      data: {
        workOrderId,
        mechanicId: session.id,
        fallaReparar: fallaReparar.trim(),
        repuestosLista: repuestosLista.trim(),
        fotoUrl: fotoUrl?.trim() || null,
        estado: "PENDIENTE_ADMIN",
      },
      include: {
        workOrder: {
          include: {
            vehicle: true,
            mechanic: true,
          },
        },
        mechanic: true,
      },
    });

    // Actualizar estado de la orden de trabajo a ESPERANDO_REPUESTOS
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        estado: "ESPERANDO_REPUESTOS",
        fechaCambioEstado: new Date(),
      },
    });

    // Si se cargó una foto, guardarla también en la galería de evidencias de la orden con etiqueta REPUESTO_ROTO
    if (fotoUrl && typeof fotoUrl === "string" && fotoUrl.trim()) {
      try {
        await prisma.workOrderMultimedia.create({
          data: {
            workOrderId,
            tipo: "FOTO",
            urlStorage: fotoUrl.trim(),
            etiqueta: "REPUESTO_ROTO",
            descripcion: `Pausa por repuestos: ${fallaReparar.trim()}`,
          },
        });
      } catch (mediaErr) {
        console.warn("Aviso: no se pudo anexar foto a WorkOrderMultimedia:", mediaErr);
      }
    }

    // Registrar en auditoría
    await recordAuditLog({
      accion: "CREATE",
      entidad: "SparePartRequest",
      entidadId: sparePartReq.id,
      valores: {
        ordenNumero: workOrder.numeroOrden,
        patente: workOrder.vehicle?.patente,
        fallaReparar: fallaReparar.trim(),
        repuestos: repuestosLista.trim(),
        mecanico: `${session.nombre} ${session.apellido || ""}`.trim(),
      },
    });

    return NextResponse.json(
      {
        message: "Solicitud de repuestos registrada con éxito y orden pausada",
        request: sparePartReq,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar solicitud de repuestos:", error);
    return NextResponse.json(
      { error: "Error interno al crear solicitud de repuestos: " + error.message },
      { status: 500 }
    );
  }
}
