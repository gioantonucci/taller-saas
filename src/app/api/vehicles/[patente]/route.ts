import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { patente: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { patente } = params;
    const cleanPatente = decodeURIComponent(patente).trim().toUpperCase();

    const vehicle = await prisma.vehicle.findUnique({
      where: { patente: cleanPatente },
      include: {
        client: true,
        workOrders: {
          include: {
            mechanic: {
              select: { id: true, nombre: true, apellido: true },
            },
            parts: true,
            multimedia: true,
            workLogs: true,
          },
          orderBy: { fechaIngreso: "desc" },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    // Calcular estadísticas clínicas del vehículo
    const totalServicios = vehicle.workOrders.length;
    const repuestosHistoricos = vehicle.workOrders.flatMap((o) => o.parts);
    const totalGastado = vehicle.workOrders.reduce((sum, o) => sum + (o.totalPresupuesto || 0), 0);

    return NextResponse.json({
      success: true,
      vehicle,
      clinicalStats: {
        totalServicios,
        totalRepuestosReemplazados: repuestosHistoricos.length,
        totalInvertidoEnVehiculo: totalGastado,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/vehicles/[patente]:", error);
    return NextResponse.json({ error: "Error al obtener historial del vehículo" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { patente: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { patente } = params;
    const cleanPatente = decodeURIComponent(patente).trim().toUpperCase();
    const body = await request.json();

    const current = await prisma.vehicle.findUnique({
      where: { patente: cleanPatente },
      include: { client: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    const isSoftDelete =
      (body.status === "INACTIVE" && current.status !== "INACTIVE") ||
      (body.isDeleted === true && !current.isDeleted);

    if (isSoftDelete) {
      const softDeleted = await prisma.vehicle.update({
        where: { patente: cleanPatente },
        data: {
          status: "INACTIVE",
          isDeleted: true,
        },
      });

      await recordAuditLog({
        user: session,
        accion: "SOFT_DELETE",
        entidad: "Vehicles",
        entidadAfectada: "Vehicles",
        entidadId: current.id,
        valores: {
          anterior: { status: current.status, isDeleted: current.isDeleted },
          nuevo: { status: "INACTIVE", isDeleted: true },
        },
        detallesCambio: {
          anterior: { status: current.status, isDeleted: current.isDeleted },
          nuevo: { status: "INACTIVE", isDeleted: true },
          descripcion: `Baja lógica (Soft Delete) del vehículo ${current.marca} ${current.modelo} (${current.patente})`,
        },
      });

      return NextResponse.json({
        success: true,
        vehicle: softDeleted,
        message: "Vehículo dado de baja lógica correctamente",
      });
    }

    const updateData: any = {};
    if (body.marca) updateData.marca = body.marca.trim();
    if (body.modelo) updateData.modelo = body.modelo.trim();
    if (body.anio) updateData.anio = parseInt(body.anio, 10);
    if (body.color !== undefined) updateData.color = body.color.trim();
    if (body.nroChasis !== undefined) updateData.nroChasis = body.nroChasis.trim();
    if (body.nroMotor !== undefined) updateData.nroMotor = body.nroMotor.trim();
    if (body.clientId) updateData.clientId = body.clientId;

    const updated = await prisma.vehicle.update({
      where: { patente: cleanPatente },
      data: updateData,
      include: { client: true },
    });

    const anteriorVehicleDiff = {
      marca: current.marca,
      modelo: current.modelo,
      anio: current.anio,
      color: current.color,
      nroChasis: current.nroChasis,
      nroMotor: current.nroMotor,
    };
    const nuevoVehicleDiff = {
      marca: updated.marca,
      modelo: updated.modelo,
      anio: updated.anio,
      color: updated.color,
      nroChasis: updated.nroChasis,
      nroMotor: updated.nroMotor,
    };

    await recordAuditLog({
      user: session,
      accion: "UPDATE",
      entidad: "Vehicles",
      entidadAfectada: "Vehicles",
      entidadId: current.id,
      valores: { anterior: anteriorVehicleDiff, nuevo: nuevoVehicleDiff },
      detallesCambio: {
        anterior: anteriorVehicleDiff,
        nuevo: nuevoVehicleDiff,
        descripcion: `Actualización de ficha técnica del vehículo ${current.patente} (${updated.marca} ${updated.modelo})`,
      },
    });

    return NextResponse.json({ success: true, vehicle: updated });
  } catch (error: any) {
    console.error("Error en PATCH /api/vehicles/[patente]:", error);
    return NextResponse.json({ error: "Error al actualizar vehículo" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { patente: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { patente } = params;
    const cleanPatente = decodeURIComponent(patente).trim().toUpperCase();

    const current = await prisma.vehicle.findUnique({
      where: { patente: cleanPatente },
    });

    if (!current) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    // NUNCA DELETE físico: Soft Delete
    const softDeleted = await prisma.vehicle.update({
      where: { patente: cleanPatente },
      data: {
        status: "INACTIVE",
        isDeleted: true,
      },
    });

    await recordAuditLog({
      user: session,
      accion: "SOFT_DELETE",
      entidad: "Vehicles",
      entidadAfectada: "Vehicles",
      entidadId: current.id,
      valores: {
        anterior: { status: current.status, isDeleted: current.isDeleted },
        nuevo: { status: "INACTIVE", isDeleted: true },
      },
      detallesCambio: {
        anterior: { status: current.status, isDeleted: current.isDeleted },
        nuevo: { status: "INACTIVE", isDeleted: true },
        descripcion: `Baja lógica (Soft Delete) del vehículo ${current.marca} ${current.modelo} (${current.patente})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Vehículo dado de baja lógica correctamente",
      vehicle: softDeleted,
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/vehicles/[patente]:", error);
    return NextResponse.json({ error: "Error al eliminar vehículo" }, { status: 500 });
  }
}
