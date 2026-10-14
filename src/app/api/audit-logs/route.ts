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

    // Restricción estricta de RBAC: solo ADMIN/Dueño puede auditar
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para el Administrador / Dueño del taller" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entidad = searchParams.get("entidad");
    const accion = searchParams.get("accion");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const rangoFecha = searchParams.get("rangoFecha"); // "HOY", "7_DIAS", "ESTE_MES", "CUSTOM"
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const where: any = {};
    const andConditions: any[] = [];

    if (entidad && entidad !== "TODAS") {
      andConditions.push({
        OR: [
          { entidadAfectada: entidad },
          { entidad: entidad },
        ],
      });
    }

    if (accion && accion !== "TODAS") {
      andConditions.push({ accion });
    }

    if (userId && userId !== "TODOS") {
      andConditions.push({ userId });
    }

    if (search) {
      andConditions.push({
        OR: [
          { userName: { contains: search } },
          { userEmail: { contains: search } },
          { detallesCambio: { contains: search } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Filtros rápidos por fecha
    if (rangoFecha === "HOY") {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      where.timestamp = { gte: hoy };
    } else if (rangoFecha === "7_DIAS") {
      const sieteDias = new Date();
      sieteDias.setDate(sieteDias.getDate() - 7);
      where.timestamp = { gte: sieteDias };
    } else if (rangoFecha === "ESTE_MES") {
      const primerDiaMes = new Date();
      primerDiaMes.setDate(1);
      primerDiaMes.setHours(0, 0, 0, 0);
      where.timestamp = { gte: primerDiaMes };
    } else if (fechaDesde || fechaHasta) {
      where.timestamp = {};
      if (fechaDesde) {
        where.timestamp.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.timestamp.lte = hasta;
      }
    }

    const [logs, users] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: 200,
      }),
      prisma.user.findMany({
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          role: true,
        },
        orderBy: { nombre: "asc" },
      }),
    ]);

    const parsedLogs = logs.map((log) => {
      let parsedDetalles = null;
      try {
        parsedDetalles = JSON.parse(log.detallesCambio);
      } catch {
        parsedDetalles = log.detallesCambio;
      }
      return {
        ...log,
        detallesParsed: parsedDetalles,
      };
    });

    return NextResponse.json({ success: true, logs: parsedLogs, users });
  } catch (error: any) {
    console.error("Error en GET /api/audit-logs:", error);
    return NextResponse.json(
      { error: "Error al obtener registros de auditoría" },
      { status: 500 }
    );
  }
}
