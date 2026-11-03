import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, normalizeRole } from "@/lib/auth";
import {
  SPARE_PARTS_CONFIG,
  isSparePartEscalated,
  isLlegadaVencida,
  formatTiempoTranscurrido,
} from "@/lib/spare-parts-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/spare-parts/reminders
 * Endpoint de alto rendimiento para consulta periódica (polling cada 60s)
 * Provee al cliente los datos precisos para:
 * 1. Banner fijo no cerrable para Recepción
 * 2. Ventana modal periódica de preguntas ("¿Ya encargaste los repuestos...?")
 * 3. Escalamiento en rojo y alertas al Administrador
 * 4. Recordatorio de llegada vencida ("¿Llegaron los repuestos...?")
 * 5. Avisos en pantalla al mecánico (Devuelto o Recibido)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = normalizeRole(session.role);

    // Consultamos solo los campos necesarios con select optimizado (evita joins pesados)
    const activeRequests = await prisma.sparePartRequest.findMany({
      where: {
        estado: {
          in: [
            "SOLICITADO",
            "EN_REVISION",
            "PARA_ENCARGAR",
            "DEVUELTO",
            "ENCARGO_REALIZADO",
            "RECIBIDO",
            "PENDIENTE_ADMIN",
            "PROCESADO_ADMIN",
            "RECIBIDO_PARCIAL",
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        workOrderId: true,
        estado: true,
        fallaReparar: true,
        itemsAEncargar: true,
        itemsSolicitados: true,
        fechaRevision: true,
        updatedAt: true,
        createdAt: true,
        fechaEstimadaLlegada: true,
        proveedor: true,
        motivoDevolucion: true,
        mechanicId: true,
        workOrder: {
          select: {
            numeroOrden: true,
            mechanicId: true,
            vehicle: {
              select: {
                patente: true,
                marca: true,
                modelo: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();

    // 1. Pedidos en "Para encargar"
    const paraEncargarList = activeRequests
      .filter((r) => r.estado === "PARA_ENCARGAR" || r.estado === "PROCESADO_ADMIN")
      .map((r) => {
        const baseDate = r.fechaRevision || r.updatedAt || r.createdAt;
        const diffMs = now.getTime() - new Date(baseDate).getTime();
        const elapsedMinutes = Math.floor(diffMs / (1000 * 60));
        const escalated = isSparePartEscalated(r);

        return {
          id: r.id,
          workOrderId: r.workOrderId,
          numeroOrden: r.workOrder?.numeroOrden,
          patente: r.workOrder?.vehicle?.patente,
          modelo: `${r.workOrder?.vehicle?.marca || ""} ${r.workOrder?.vehicle?.modelo || ""}`.trim(),
          fallaReparar: r.fallaReparar,
          itemsCount: (() => {
            try {
              if (r.itemsAEncargar) return JSON.parse(r.itemsAEncargar).length;
              if (r.itemsSolicitados) return JSON.parse(r.itemsSolicitados).length;
            } catch {}
            return 1;
          })(),
          createdAt: r.createdAt,
          fechaRevision: r.fechaRevision,
          elapsedMinutes,
          elapsedFormatted: formatTiempoTranscurrido(baseDate),
          isEscalated: escalated,
        };
      })
      .sort((a, b) => b.elapsedMinutes - a.elapsedMinutes); // El más antiguo primero

    const oldestParaEncargar = paraEncargarList[0] || null;
    const escalatedList = paraEncargarList.filter((p) => p.isEscalated);

    // 2. Pedidos en "Encargo realizado" con llegada vencida
    const llegadaVencidaList = activeRequests
      .filter((r) => {
        if (r.estado !== "ENCARGO_REALIZADO" && r.estado !== "RECIBIDO_PARCIAL") return false;
        return isLlegadaVencida(r);
      })
      .map((r) => ({
        id: r.id,
        workOrderId: r.workOrderId,
        numeroOrden: r.workOrder?.numeroOrden,
        patente: r.workOrder?.vehicle?.patente,
        proveedor: r.proveedor,
        fechaEstimadaLlegada: r.fechaEstimadaLlegada,
        elapsedFormatted: formatTiempoTranscurrido(r.fechaEstimadaLlegada),
      }));

    // 3. Conteo para Administrador (Solicitado o En revisión)
    const solicitadosOEnRevision = activeRequests.filter(
      (r) => r.estado === "SOLICITADO" || r.estado === "EN_REVISION" || r.estado === "PENDIENTE_ADMIN"
    );

    // 4. Avisos para Mecánico
    let mechanicNotices: any[] = [];
    if (role === "MECHANIC") {
      mechanicNotices = activeRequests
        .filter((r) => {
          const isOwner = r.mechanicId === session.id || r.workOrder?.mechanicId === session.id;
          return isOwner && (r.estado === "DEVUELTO" || r.estado === "RECIBIDO");
        })
        .map((r) => ({
          id: r.id,
          workOrderId: r.workOrderId,
          numeroOrden: r.workOrder?.numeroOrden,
          patente: r.workOrder?.vehicle?.patente,
          estado: r.estado,
          motivoDevolucion: r.motivoDevolucion,
          updatedAt: r.updatedAt,
        }));
    }

    return NextResponse.json({
      timestamp: now.toISOString(),
      config: {
        recordatorioIntervaloMinutos: SPARE_PARTS_CONFIG.RECORDATORIO_INTERVALO_MINUTOS,
        escalamientoHoras: SPARE_PARTS_CONFIG.ESCALAMIENTO_HORAS,
      },
      reception: {
        paraEncargarCount: paraEncargarList.length,
        oldestParaEncargar,
        paraEncargarList,
        llegadaVencidaCount: llegadaVencidaList.length,
        llegadaVencidaList,
        hasPendingTasks: paraEncargarList.length > 0 || llegadaVencidaList.length > 0,
      },
      admin: {
        solicitadosCount: solicitadosOEnRevision.length,
        escalatedCount: escalatedList.length,
        escalatedList,
      },
      mechanic: {
        notices: mechanicNotices,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener recordatorios de repuestos:", error);
    return NextResponse.json(
      { error: "Error al calcular recordatorios" },
      { status: 500 }
    );
  }
}
