import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { matchesSearchMulti } from "@/lib/search-utils";

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
      let targetEntities = [entidad];
      if (entidad === "WorkOrders") targetEntities = ["WorkOrders", "WorkOrder"];
      else if (entidad === "Clients") targetEntities = ["Clients", "Client"];
      else if (entidad === "Vehicles") targetEntities = ["Vehicles", "Vehicle"];
      else if (entidad === "Users") targetEntities = ["Users", "User", "Staff", "Personal"];
      else if (entidad === "Parts") targetEntities = ["Parts", "Part", "Inventory"];
      else if (entidad === "WorkLogs") targetEntities = ["WorkLogs", "WorkLog"];
      else if (entidad === "Multimedia") targetEntities = ["Multimedia", "Storage"];
      else if (entidad === "TenantSettings") targetEntities = ["TenantSettings", "Settings"];
      else if (entidad === "Auth") targetEntities = ["Auth", "Security"];

      andConditions.push({
        OR: [
          { entidadAfectada: { in: targetEntities } },
          { entidad: { in: targetEntities } },
        ],
      });
    }

    if (accion && accion !== "TODAS") {
      if (accion === "CREATE") {
        andConditions.push({ accion: "CREATE" });
      } else if (accion === "UPDATE") {
        andConditions.push({ accion: "UPDATE" });
      } else if (accion === "STATUS_CHANGE") {
        andConditions.push({
          accion: { in: ["STATUS_CHANGE", "FINALIZACION_REPARACION", "ENTREGA_VEHICULO"] },
        });
      } else if (accion === "ASIGNACION_MECANICO") {
        andConditions.push({ accion: "ASIGNACION_MECANICO" });
      } else if (accion === "PERITAJE_PROFUNDO") {
        andConditions.push({ accion: "PERITAJE_PROFUNDO" });
      } else if (accion === "FINALIZACION_REPARACION") {
        andConditions.push({ accion: "FINALIZACION_REPARACION" });
      } else if (accion === "ENTREGA_VEHICULO") {
        andConditions.push({ accion: "ENTREGA_VEHICULO" });
      } else if (accion === "AVISO_CLIENTE") {
        andConditions.push({ accion: "AVISO_CLIENTE" });
      } else if (accion === "DELETE" || accion === "ELIMINACION" || accion === "BAJA") {
        andConditions.push({
          accion: { in: ["DELETE", "SOFT_DELETE", "DELETE_MULTIMEDIA", "DAR_DE_BAJA"] },
        });
      } else if (accion === "DAR_DE_BAJA") {
        andConditions.push({ accion: "DAR_DE_BAJA" });
      } else if (accion === "MULTIMEDIA") {
        andConditions.push({
          accion: { in: ["UPLOAD_MULTIMEDIA", "UPLOAD_FILE", "DELETE_MULTIMEDIA"] },
        });
      } else if (accion === "AUTH") {
        andConditions.push({
          accion: { in: ["LOGIN", "LOGOUT"] },
        });
      } else {
        andConditions.push({ accion });
      }
    }

    if (userId && userId !== "TODOS") {
      andConditions.push({ userId });
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
        take: 500,
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

    const filteredLogs =
      search && search.trim()
        ? parsedLogs.filter((log) =>
            matchesSearchMulti(
              [
                log.userName,
                log.userEmail,
                log.detallesCambio,
                log.entidadAfectada,
                log.entidad,
                log.accion,
                log.ipAddress,
              ],
              search
            )
          )
        : parsedLogs;

    return NextResponse.json({ success: true, logs: filteredLogs, users });
  } catch (error: any) {
    console.error("Error en GET /api/audit-logs:", error);
    return NextResponse.json(
      { error: "Error al obtener registros de auditoría" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para el Administrador del taller" },
        { status: 403 }
      );
    }

    const result = await prisma.auditLog.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "Historial de auditoría vaciado correctamente.",
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error("Error al vaciar auditoría:", error);
    return NextResponse.json(
      { error: "Error al vaciar el historial de auditoría" },
      { status: 500 }
    );
  }
}
