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

    const allOrders = await prisma.workOrder.findMany({
      include: {
        vehicle: {
          include: { client: true },
        },
        mechanic: {
          select: { id: true, nombre: true, apellido: true },
        },
        workLogs: true,
      },
    });

    const totalIngresados = allOrders.length;
    const activosEnTaller = allOrders.filter(
      (o) =>
        o.estado !== "FINALIZADO" &&
        o.estado !== "REPARADO" &&
        o.estado !== "TERMINADO" &&
        o.estado !== "ENTREGADO" &&
        o.estado !== "ARCHIVADO"
    ).length;
    const finalizados = allOrders.filter(
      (o) => o.estado === "FINALIZADO" || o.estado === "REPARADO" || o.estado === "TERMINADO"
    ).length;
    const entregados = allOrders.filter(
      (o) => o.estado === "ENTREGADO" || o.estado === "ARCHIVADO"
    ).length;

    // Conteo por estados canónicos
    const countPendientePeritaje = allOrders.filter(
      (o) => o.estado === "PENDIENTE_PERITAJE" || o.estado === "PENDIENTE" || o.estado === "INGRESADO"
    ).length;
    const countEnReparacion = allOrders.filter(
      (o) => o.estado === "EN_REPARACION" || o.estado === "EN_CURSO" || o.estado === "PERITADO"
    ).length;
    const countEsperaRepuestos = allOrders.filter(
      (o) => o.estado === "EN_ESPERA_REPUESTOS" || o.estado === "ESPERANDO_REPUESTOS" || o.estado === "DETENIDO"
    ).length;
    const countFinalizado = allOrders.filter(
      (o) => o.estado === "FINALIZADO" || o.estado === "REPARADO" || o.estado === "TERMINADO"
    ).length;
    const countEntregado = allOrders.filter(
      (o) => o.estado === "ENTREGADO" || o.estado === "ARCHIVADO"
    ).length;

    const estadoCounts = {
      PENDIENTE_PERITAJE: countPendientePeritaje,
      EN_REPARACION: countEnReparacion,
      EN_ESPERA_REPUESTOS: countEsperaRepuestos,
      FINALIZADO: countFinalizado,
      ENTREGADO: countEntregado,
    };

    // =========================================================================
    // 1. GRÁFICO: Autos Ingresados vs Autos Entregados (Mes Actual)
    // =========================================================================
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Dividir el mes actual en 4 períodos semanales
    const semanasLabels = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
    const graficoAutos = semanasLabels.map((semanaLabel, idx) => {
      const startDay = idx * 7 + 1;
      const endDay = idx === 3 ? 31 : (idx + 1) * 7;

      const ingresados = allOrders.filter((o) => {
        const d = new Date(o.fechaIngreso);
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() >= startDay &&
          d.getDate() <= endDay
        );
      }).length;

      const entregadosGrafico = allOrders.filter((o) => {
        const d = o.fechaEntrega ? new Date(o.fechaEntrega) : new Date(o.updatedAt);
        const isDone =
          o.estado === "FINALIZADO" ||
          o.estado === "REPARADO" ||
          o.estado === "TERMINADO" ||
          o.estado === "ENTREGADO" ||
          o.estado === "ARCHIVADO";
        return (
          isDone &&
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() >= startDay &&
          d.getDate() <= endDay
        );
      }).length;

      return {
        periodo: semanaLabel,
        ingresados,
        entregados: entregadosGrafico,
      };
    });

    // =========================================================================
    // 2. MONITOR DE MECÁNICOS (Mecánicos activos y en qué orden trabajan)
    // =========================================================================
    const mechanicsUsers = await prisma.user.findMany({
      where: {
        OR: [{ role: "MECHANIC" }, { role: "MECANICO" }],
        status: "ACTIVE",
      },
      include: {
        workLogs: {
          take: 1,
          orderBy: { fechaRegistro: "desc" },
        },
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monitorMecanicos = mechanicsUsers.map((m) => {
      // Buscar orden activa asignada a este mecánico
      const activeOrder = allOrders.find(
        (o) =>
          o.mechanicId === m.id &&
          o.estado !== "FINALIZADO" &&
          o.estado !== "REPARADO"
      );

      // Calcular horas trabajadas hoy
      const horasHoy = allOrders
        .flatMap((o) => o.workLogs)
        .filter((wl) => wl.mechanicId === m.id && new Date(wl.fechaRegistro) >= todayStart)
        .reduce((acc, wl) => acc + wl.horasInvertidas, 0);

      const ultimoTrabajo = m.workLogs[0];

      return {
        id: m.id,
        nombre: `${m.nombre} ${m.apellido || ""}`.trim(),
        email: m.email,
        activo: true,
        horasHoy,
        ordenActiva: activeOrder
          ? {
              id: activeOrder.id,
              numeroOrden: activeOrder.numeroOrden,
              estado: activeOrder.estado,
              vehiculo: `${activeOrder.vehicle.marca} ${activeOrder.vehicle.modelo}`,
              patente: activeOrder.vehicle.patente,
              cliente: `${activeOrder.vehicle.client.nombre} ${activeOrder.vehicle.client.apellido}`,
              detalles: activeOrder.detallesIngreso,
            }
          : null,
        ultimaTarea: ultimoTrabajo ? ultimoTrabajo.descripcionTarea : "Sin tareas recientes registradas",
      };
    });

    // Últimas órdenes para el feed de inicio
    const ultimasOrdenes = await prisma.workOrder.findMany({
      take: 6,
      orderBy: { fechaIngreso: "desc" },
      include: {
        vehicle: {
          include: { client: true },
        },
        mechanic: {
          select: { nombre: true, apellido: true },
        },
      },
    });

    const esAdmin = session.role === "ADMIN";

    return NextResponse.json({
      success: true,
      metrics: {
        activosEnTaller,
        totalIngresados,
        finalizados,
        estadoCounts,
      },
      graficoAutos,
      monitorMecanicos,
      ultimasOrdenes,
      esAdmin,
    });
  } catch (error: any) {
    console.error("Error en GET /api/metrics:", error);
    return NextResponse.json({ error: "Error al calcular métricas" }, { status: 500 });
  }
}
