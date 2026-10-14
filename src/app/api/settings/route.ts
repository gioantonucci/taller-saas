import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    let settings = await prisma.tenantSettings.findFirst();
    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: {
          tallerNombre: "POGGI Taller Integral",
          whatsapp: "+34 656 40 62 86",
          logoUrl: "/images/poggi/logo.png",
          direccion: "C. de Sant Pius X, 13, 46017 València, España",
          horarios: "Lunes a viernes · 08:00–18:00",
          email: "poggitallerintegral@gmail.com",
          descripcion:
            "Más de 30 años cuidando tu vehículo en Valencia. Mecánica general, diagnóstico electrónico de precisión, electricidad y climatización.",
          valorHoraManoDeObra: 45,
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("Error en GET /api/settings:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden modificar los ajustes del taller" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const current = await prisma.tenantSettings.findFirst();

    const dataToUpdate: any = {};
    if (body.tallerNombre !== undefined) dataToUpdate.tallerNombre = body.tallerNombre.trim();
    if (body.whatsapp !== undefined) dataToUpdate.whatsapp = body.whatsapp.trim();
    if (body.logoUrl !== undefined) dataToUpdate.logoUrl = body.logoUrl.trim();
    if (body.direccion !== undefined) dataToUpdate.direccion = body.direccion.trim();
    if (body.horarios !== undefined) dataToUpdate.horarios = body.horarios.trim();
    if (body.email !== undefined) dataToUpdate.email = body.email.trim();
    if (body.descripcion !== undefined) dataToUpdate.descripcion = body.descripcion.trim();
    if (body.valorHoraManoDeObra !== undefined) {
      const parsed = parseFloat(body.valorHoraManoDeObra);
      if (!isNaN(parsed) && parsed >= 0) {
        dataToUpdate.valorHoraManoDeObra = parsed;
      }
    }

    const updated = current
      ? await prisma.tenantSettings.update({
          where: { id: current.id },
          data: dataToUpdate,
        })
      : await prisma.tenantSettings.create({
          data: {
            tallerNombre: body.tallerNombre || "POGGI Taller Integral",
            whatsapp: body.whatsapp || "+34 656 40 62 86",
            logoUrl: body.logoUrl || "/images/poggi/logo.png",
            direccion: body.direccion || "C. de Sant Pius X, 13, 46017 València, España",
            horarios: body.horarios || "Lunes a viernes · 08:00–18:00",
            email: body.email || "poggitallerintegral@gmail.com",
            descripcion:
              body.descripcion ||
              "Más de 30 años cuidando tu vehículo en Valencia. Mecánica general, diagnóstico electrónico de precisión, electricidad y climatización.",
            valorHoraManoDeObra: body.valorHoraManoDeObra || 45,
          },
        });

    await recordAuditLog({
      user: session,
      accion: "UPDATE",
      entidad: "TenantSettings",
      entidadAfectada: "TenantSettings",
      entidadId: updated.id,
      detallesCambio: {
        anterior: current,
        nuevo: updated,
        descripcion: "Actualización de configuración de taller (White-Label) y parámetros operativos",
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("Error en PATCH /api/settings:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
