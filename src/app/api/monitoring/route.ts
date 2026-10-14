import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para el Administrador / Dueño del taller" },
        { status: 403 }
      );
    }

    // Obtener mecánicos activos
    const mechanics = await prisma.user.findMany({
      where: { role: { in: ["MECHANIC", "MECANICO"] }, status: "ACTIVE" },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
      },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const monitoringData = await Promise.all(
      mechanics.map(async (mechanic) => {
        // Orden activa en taller
        const activeOrder = await prisma.workOrder.findFirst({
          where: {
            mechanicId: mechanic.id,
            estado: {
              in: [
                "PENDIENTE_PERITAJE",
                "PENDIENTE",
                "EN_REPARACION",
                "EN_CURSO",
                "EN_ESPERA_REPUESTOS",
                "ESPERANDO_REPUESTOS",
              ],
            },
          },
          include: {
            vehicle: true,
          },
          orderBy: { updatedAt: "desc" },
        });

        // Logs de horas de hoy
        const todayLogs = await prisma.workLog.findMany({
          where: {
            mechanicId: mechanic.id,
            fechaRegistro: { gte: startOfToday },
          },
          orderBy: { fechaRegistro: "desc" },
        });

        const totalHoursToday = todayLogs.reduce((acc, log) => acc + log.horasInvertidas, 0);
        const lastTask = todayLogs[0] || null;

        let statusText = "DISPONIBLE";
        let statusBadge = "bg-slate-100 text-slate-700 border-slate-300";

        if (activeOrder) {
          if (activeOrder.estado === "PENDIENTE_PERITAJE" || activeOrder.estado === "PENDIENTE") {
            statusText = "PENDIENTE_PERITAJE";
            statusBadge = "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-500/20";
          } else if (activeOrder.estado === "EN_REPARACION" || activeOrder.estado === "EN_CURSO") {
            statusText = "EN_REPARACION";
            statusBadge = "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/20";
          } else if (activeOrder.estado === "EN_ESPERA_REPUESTOS" || activeOrder.estado === "ESPERANDO_REPUESTOS") {
            statusText = "EN_ESPERA_REPUESTOS";
            statusBadge = "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-500/20";
          }
        }

        return {
          mechanic,
          activeOrder: activeOrder
            ? {
                id: activeOrder.id,
                numeroOrden: activeOrder.numeroOrden,
                patente: activeOrder.vehicle.patente,
                marcaModelo: `${activeOrder.vehicle.marca} ${activeOrder.vehicle.modelo}`,
                estado: activeOrder.estado,
                updatedAt: activeOrder.updatedAt,
              }
            : null,
          todayLogsCount: todayLogs.length,
          totalHoursToday,
          lastTask: lastTask ? lastTask.descripcionTarea : "Sin tareas registradas hoy",
          lastLogTime: lastTask ? lastTask.fechaRegistro : null,
          statusText,
          statusBadge,
        };
      })
    );

    return NextResponse.json({ success: true, monitoring: monitoringData });
  } catch (error: any) {
    console.error("Error en GET /api/monitoring:", error);
    return NextResponse.json(
      { error: "Error al obtener el monitoreo en vivo de mecánicos" },
      { status: 500 }
    );
  }
}
