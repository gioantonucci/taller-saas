import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { clientFormSchema } from "@/lib/validations";

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

    // Filtrar por baja lógica (Soft Delete) por defecto
    if (!includeInactive) {
      where.isDeleted = false;
      where.status = "ACTIVE";
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { nombre: { contains: term } },
        { apellido: { contains: term } },
        { dni: { contains: term } },
        { telefono: { contains: term } },
        { email: { contains: term } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        vehicles: {
          where: { isDeleted: false, status: "ACTIVE" },
        },
        _count: {
          select: { vehicles: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error("Error en GET /api/clients:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validación estricta con Zod
    const validation = clientFormSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Datos del formulario inválidos";
      return NextResponse.json({ error: firstError, details: validation.error.flatten() }, { status: 400 });
    }

    const { nombre, apellido, dni, direccion, telefono, email } = validation.data;
    const cleanDni = dni.trim();

    // Verificar unicidad de DNI en clientes activos
    const existing = await prisma.client.findUnique({
      where: { dni: cleanDni },
    });

    if (existing) {
      if (existing.isDeleted || existing.status === "INACTIVE") {
        // Si estaba dado de baja lógica, se reactiva con los nuevos datos
        const reactivated = await prisma.client.update({
          where: { id: existing.id },
          data: {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            direccion: direccion || "",
            telefono: telefono.trim(),
            email: email ? email.trim().toLowerCase() : "",
            isDeleted: false,
            status: "ACTIVE",
          },
        });

        await recordAuditLog({
          user: session,
          accion: "UPDATE",
          entidad: "Clients",
          entidadAfectada: "Clients",
          entidadId: reactivated.id,
          valores: { nuevo: reactivated, reactivado: true },
          detallesCambio: {
            descripcion: `Reactivación y actualización de cliente DNI ${reactivated.dni}`,
          },
        });

        return NextResponse.json({ success: true, client: reactivated, reactivated: true });
      }

      return NextResponse.json(
        { error: `Ya existe un cliente activo registrado con el DNI/CUIT ${cleanDni}` },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: cleanDni,
        direccion: direccion || "",
        telefono: telefono.trim(),
        email: email ? email.trim().toLowerCase() : "",
        isDeleted: false,
        status: "ACTIVE",
      },
    });

    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidad: "Clients",
      entidadAfectada: "Clients",
      entidadId: client.id,
      valores: {
        nombre: client.nombre,
        apellido: client.apellido,
        dni: client.dni,
        telefono: client.telefono,
        email: client.email,
      },
      detallesCambio: {
        nuevo: client,
        descripcion: `Creación de cliente ${client.nombre} ${client.apellido} (DNI ${client.dni})`,
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("Error en POST /api/clients:", error);
    return NextResponse.json({ error: "Error al registrar cliente" }, { status: 500 });
  }
}
