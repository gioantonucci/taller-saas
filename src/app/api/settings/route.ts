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
          tallerNombre: "Taller Mecánico Central Pro",
          whatsapp: "+54 9 11 4567-8900",
          logoUrl: "/logo.png",
          direccion: "Av. del Libertador 4580, Buenos Aires",
          horarios: "Lunes a Viernes: 08:00 a 19:00 | Sábados: 08:30 a 13:00",
          email: "contacto@tallerpro.com",
          descripcion:
            "Servicio integral del automotor, inyección electrónica, mecánica general y diagnóstico computarizado con tecnología de punta.",
          valorHoraManoDeObra: 15000,
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
            tallerNombre: body.tallerNombre || "Taller Mecánico Central Pro",
            whatsapp: body.whatsapp || "+54 9 11 4567-8900",
            logoUrl: body.logoUrl || "/logo.png",
            direccion: body.direccion || "Av. del Libertador 4580, Buenos Aires",
            horarios: body.horarios || "Lunes a Viernes: 08:00 a 19:00 | Sábados: 08:30 a 13:00",
            email: body.email || "contacto@tallerpro.com",
            descripcion:
              body.descripcion ||
              "Servicio integral del automotor, inyección electrónica, mecánica general y diagnóstico computarizado.",
            valorHoraManoDeObra: body.valorHoraManoDeObra || 15000,
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
