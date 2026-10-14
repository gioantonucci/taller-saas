import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

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
    const { urlStorage, tipo = "FOTO", descripcion, etiqueta = "INGRESO" } = body;

    if (!urlStorage) {
      return NextResponse.json(
        { error: "La URL del Object Storage es requerida" },
        { status: 400 }
      );
    }

    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const multimediaItem = await prisma.workOrderMultimedia.create({
      data: {
        workOrderId: id,
        urlStorage,
        tipo,
        descripcion: descripcion || "Evidencia fotográfica de peritaje",
        etiqueta,
      },
    });

    // Auditoría
    await recordAuditLog({
      user: session,
      accion: "UPLOAD_MULTIMEDIA",
      entidadAfectada: "Multimedia",
      entidadId: multimediaItem.id,
      detallesCambio: {
        nuevo: {
          ordenId: id,
          numeroOrden: order.numeroOrden,
          etiqueta,
          url: urlStorage,
        },
        descripcion: `Carga de evidencia multimedia (${tipo}) para orden #${order.numeroOrden}`,
      },
    });

    return NextResponse.json({ success: true, item: multimediaItem });
  } catch (error: any) {
    console.error("Error en POST /api/work-orders/[id]/multimedia:", error);
    return NextResponse.json(
      { error: "Error al guardar el archivo multimedia" },
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

    const { id } = params;
    const { searchParams } = new URL(request.url);
    let mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      try {
        const body = await request.json();
        mediaId = body.mediaId;
      } catch {}
    }

    if (!mediaId) {
      return NextResponse.json({ error: "Se requiere mediaId para eliminar" }, { status: 400 });
    }

    const existing = await prisma.workOrderMultimedia.findFirst({
      where: { id: mediaId, workOrderId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Evidencia multimedia no encontrada" }, { status: 404 });
    }

    await prisma.workOrderMultimedia.delete({
      where: { id: mediaId },
    });

    await recordAuditLog({
      user: session,
      accion: "DELETE_MULTIMEDIA",
      entidadAfectada: "Multimedia",
      entidadId: mediaId,
      detallesCambio: {
        eliminado: existing,
        descripcion: `Eliminación de evidencia multimedia para orden ${id}`,
      },
    });

    return NextResponse.json({ success: true, message: "Evidencia eliminada correctamente" });
  } catch (error: any) {
    console.error("Error en DELETE /api/work-orders/[id]/multimedia:", error);
    return NextResponse.json({ error: "Error al eliminar multimedia" }, { status: 500 });
  }
}
