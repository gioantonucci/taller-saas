import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { quickVehicleAndClientSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};

    if (!includeInactive) {
      where.isDeleted = false;
      where.status = "ACTIVE";
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { patente: { contains: term.toUpperCase() } },
        { marca: { contains: term } },
        { modelo: { contains: term } },
        { client: { nombre: { contains: term } } },
        { client: { apellido: { contains: term } } },
        { client: { dni: { contains: term } } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        client: true,
        workOrders: {
          select: { id: true, numeroOrden: true, estado: true, fechaIngreso: true },
          orderBy: { fechaIngreso: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, vehicles });
  } catch (error: any) {
    console.error("Error en GET /api/vehicles:", error);
    return NextResponse.json({ error: "Error al obtener vehículos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role === "MECANICO" || session.role === "MECHANIC") {
      return NextResponse.json(
        { error: "No tiene permisos para dar de alta vehículos" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validación de entrada con Zod
    const validation = quickVehicleAndClientSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Datos del vehículo o cliente inválidos";
      return NextResponse.json({ error: firstError, details: validation.error.flatten() }, { status: 400 });
    }

    const data = validation.data;
    const cleanPatente = data.patente.trim().toUpperCase();

    // 1. Verificar si ya existe un vehículo con esa patente
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { patente: cleanPatente },
      include: { client: true },
    });

    if (existingVehicle) {
      if (existingVehicle.isDeleted || existingVehicle.status === "INACTIVE") {
        // Reactivación si estaba en baja lógica
        const reactivated = await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            marca: data.marca.trim(),
            modelo: data.modelo.trim(),
            anio: data.anio,
            color: data.color || existingVehicle.color,
            nroChasis: data.nroChasis || existingVehicle.nroChasis,
            nroMotor: data.nroMotor || existingVehicle.nroMotor,
            isDeleted: false,
            status: "ACTIVE",
          },
          include: { client: true },
        });

        await recordAuditLog({
          user: session,
          accion: "UPDATE",
          entidad: "Vehicles",
          entidadAfectada: "Vehicles",
          entidadId: reactivated.id,
          valores: { reactivado: true, patente: reactivated.patente },
          detallesCambio: {
            descripcion: `Reactivación de vehículo ${reactivated.marca} ${reactivated.modelo} (${reactivated.patente})`,
          },
        });

        return NextResponse.json({ success: true, vehicle: reactivated, reactivated: true });
      }

      return NextResponse.json(
        { error: `Ya existe un vehículo activo registrado con la patente ${cleanPatente} (pertenece a ${existingVehicle.client.nombre} ${existingVehicle.client.apellido})` },
        { status: 400 }
      );
    }

    // 2. Resolver o Crear Cliente
    let finalClientId: string;

    if (data.modoCliente === "EXISTENTE" && data.clientId) {
      const existingClient = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!existingClient) {
        return NextResponse.json({ error: "El cliente seleccionado no existe" }, { status: 400 });
      }
      finalClientId = existingClient.id;
    } else {
      // Alta rápida de cliente nuevo
      const cleanDni = (data.clienteDni || "").trim();
      const existingByDni = await prisma.client.findUnique({ where: { dni: cleanDni } });

      if (existingByDni) {
        finalClientId = existingByDni.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            nombre: (data.clienteNombre || "Cliente").trim(),
            apellido: (data.clienteApellido || "Nuevo").trim(),
            dni: cleanDni,
            telefono: (data.clienteTelefono || "").trim(),
            email: (data.clienteEmail || "").trim().toLowerCase(),
            direccion: "Registrado en alta de vehículo",
            isDeleted: false,
            status: "ACTIVE",
          },
        });
        finalClientId = newClient.id;

        await recordAuditLog({
          user: session,
          accion: "CREATE",
          entidad: "Clients",
          entidadAfectada: "Clients",
          entidadId: newClient.id,
          valores: { nombre: newClient.nombre, apellido: newClient.apellido, dni: newClient.dni },
          detallesCambio: {
            descripcion: `Alta rápida de cliente ${newClient.nombre} ${newClient.apellido} al registrar vehículo`,
          },
        });
      }
    }

    // 3. Crear Vehículo
    const vehicle = await prisma.vehicle.create({
      data: {
        clientId: finalClientId,
        patente: cleanPatente,
        marca: data.marca.trim(),
        modelo: data.modelo.trim(),
        anio: data.anio,
        color: data.color ? data.color.trim() : null,
        nroChasis: data.nroChasis ? data.nroChasis.trim() : null,
        nroMotor: data.nroMotor ? data.nroMotor.trim() : null,
        isDeleted: false,
        status: "ACTIVE",
      },
      include: {
        client: true,
      },
    });

    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidad: "Vehicles",
      entidadAfectada: "Vehicles",
      entidadId: vehicle.id,
      valores: {
        patente: vehicle.patente,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        anio: vehicle.anio,
        clientId: vehicle.clientId,
      },
      detallesCambio: {
        descripcion: `Alta de vehículo ${vehicle.marca} ${vehicle.modelo} patente ${vehicle.patente} asignado a ${vehicle.client.nombre} ${vehicle.client.apellido}`,
      },
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (error: any) {
    console.error("Error en POST /api/vehicles:", error);
    return NextResponse.json({ error: "Error al registrar vehículo" }, { status: 500 });
  }
}
