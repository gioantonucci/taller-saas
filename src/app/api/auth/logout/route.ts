import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (session) {
    await recordAuditLog({
      user: session,
      accion: "LOGOUT",
      entidadAfectada: "Auth",
      detallesCambio: {
        email: session.email,
        mensaje: "Cierre de sesión manual",
      },
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });
  }

  const response = NextResponse.json({ success: true, message: "Sesión cerrada exitosamente" });
  response.cookies.delete("auth_token");
  return response;
}
