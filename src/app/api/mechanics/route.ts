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

    const mechanics = await prisma.user.findMany({
      where: {
        role: { in: ["MECHANIC", "MECANICO"] },
        status: "ACTIVE",
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ success: true, mechanics });
  } catch (error: any) {
    console.error("Error en GET /api/mechanics:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de mecánicos" },
      { status: 500 }
    );
  }
}
