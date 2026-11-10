import { NextRequest, NextResponse } from "next/server";
import { getSession, signToken, normalizeRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const testModeCookie = request.cookies.get("poggi_test_mode")?.value === "1";

    const isAllowed = session?.email?.toLowerCase() === "test@test.com" || testModeCookie;
    if (!isAllowed) {
      return NextResponse.json(
        { error: "No autorizado para cambiar de rol en modo prueba" },
        { status: 403 }
      );
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const targetEmail = email.toLowerCase().trim();
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "El usuario se encuentra inactivo" }, { status: 400 });
    }

    const userSession = {
      id: targetUser.id,
      email: targetUser.email,
      nombre: targetUser.nombre,
      apellido: targetUser.apellido || null,
      role: normalizeRole(targetUser.role),
      tenantId: targetUser.tenantId || null,
    };

    const token = await signToken(userSession);

    const response = NextResponse.json({
      success: true,
      user: userSession,
    });

    // Guardar cookie de sesión del nuevo usuario
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    // Mantener la cookie que identifica que la navegación proviene del usuario de prueba
    response.cookies.set("poggi_test_mode", "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error en POST /api/auth/test-switch:", error);
    return NextResponse.json(
      { error: "Error interno al cambiar de usuario" },
      { status: 500 }
    );
  }
}
