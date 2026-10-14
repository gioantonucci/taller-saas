import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    if (!result.success || !result.user || !result.token) {
      await recordAuditLog({
        user: null,
        accion: "LOGIN",
        entidadAfectada: "Auth",
        detallesCambio: {
          intentoFallidoEmail: email,
          motivo: result.error,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Registrar log de auditoría de inicio de sesión exitoso
    await recordAuditLog({
      user: result.user,
      accion: "LOGIN",
      entidadAfectada: "Auth",
      detallesCambio: {
        email: result.user.email,
        rol: result.user.role,
        mensaje: "Inicio de sesión exitoso",
      },
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Guardar cookie HTTP-Only segura
    response.cookies.set("auth_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error en POST /api/auth/login:", error);
    return NextResponse.json(
      { error: "Ocurrió un error en el servidor al autenticar" },
      { status: 500 }
    );
  }
}
