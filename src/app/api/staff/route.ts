import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, normalizeRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para administradores" },
        { status: 403 }
      );
    }

    const staff = await prisma.user.findMany({
      where: {
        role: { in: ["MECHANIC", "MECANICO", "RECEPTION", "RECEPCION"] },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        status: true,
        creadoEn: true,
        updatedAt: true,
        _count: {
          select: {
            workOrdersMechanic: {
              where: {
                estado: {
                  notIn: [
                    "FINALIZADO",
                    "REPARADO",
                    "TERMINADO",
                    "ENTREGADO",
                    "ARCHIVADO",
                    "CANCELADO",
                    "CANCELADA",
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // ACTIVE first
        { nombre: "asc" },
      ],
    });

    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    console.error("Error en GET /api/staff:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de personal" },
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

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso exclusivo para administradores" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nombre, apellido, email, password, role } = body;

    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre es obligatorio y debe tener al menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Debe ingresar un correo electrónico válido" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña es obligatoria y debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const normalizedRole = normalizeRole(role);
    if (normalizedRole !== "MECHANIC" && normalizedRole !== "RECEPTION") {
      return NextResponse.json(
        { error: "El rol debe ser Mecánico (MECHANIC) o Recepción (RECEPTION)" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un usuario registrado con el correo ${cleanEmail}` },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        nombre: nombre.trim(),
        apellido: apellido && typeof apellido === "string" ? apellido.trim() : null,
        email: cleanEmail,
        passwordHash,
        role: normalizedRole,
        status: "ACTIVE",
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        status: true,
        creadoEn: true,
      },
    });

    const rolLabel = normalizedRole === "MECHANIC" ? "Mecánico" : "Recepción";

    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidad: "Users",
      entidadAfectada: "Users",
      entidadId: newUser.id,
      valores: {
        nuevo: {
          nombre: newUser.nombre,
          apellido: newUser.apellido,
          email: newUser.email,
          role: newUser.role,
          status: "ACTIVE",
        },
      },
      detallesCambio: {
        nuevo: {
          nombre: newUser.nombre,
          apellido: newUser.apellido,
          email: newUser.email,
          role: newUser.role,
          status: "ACTIVE",
        },
        descripcion: `Alta de personal: ${newUser.nombre} ${newUser.apellido || ""} (${rolLabel})`,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/staff:", error);
    return NextResponse.json(
      { error: "Error interno al dar de alta el personal" },
      { status: 500 }
    );
  }
}
