import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-auto-taller-saas-2026-secure-random"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Interceptar rutas protegidas bajo /app/* (excepto la página de login /app/login)
  if (pathname.startsWith("/app") && !pathname.startsWith("/app/login")) {
    const token = request.cookies.get("auth_token")?.value;

    // Si no tiene token válido, redirigir a /login
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = String(payload.role || "").toUpperCase();

      // =========================================================================
      // Control de Acceso Basado en Roles (RBAC)
      // =========================================================================

      // 1. Rol MECHANIC: Solo tiene acceso a la Hoja de Ruta (/app/taller/*)
      if (role === "MECHANIC" || role === "MECANICO") {
        if (!pathname.startsWith("/app/taller")) {
          return NextResponse.redirect(new URL("/app/taller/hoja-ruta", request.url));
        }
      }

      // 2. Rol RECEPTION: Acceso a Clientes, Vehículos y Órdenes.
      // Restringido de: /app/dashboard, /app/admin/*, /app/configuracion, /app/taller/*
      if (role === "RECEPTION" || role === "RECEPCION") {
        if (
          pathname.startsWith("/app/admin") ||
          pathname.startsWith("/app/dashboard") ||
          pathname.startsWith("/app/configuracion") ||
          pathname.startsWith("/app/taller")
        ) {
          return NextResponse.redirect(new URL("/app/ordenes", request.url));
        }
      }

      // 3. Rol ADMIN: Acceso irrestricto a todas las rutas
      return NextResponse.next();
    } catch {
      // Token inválido o expirado -> Limpiar cookie y redirigir a /login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("expired", "1");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth_token");
      return response;
    }
  }

  // Si ya está autenticado e intenta ir al login (/login o /app/login), redirigir a su pantalla principal lógica
  if (pathname === "/login" || pathname === "/app/login") {
    const token = request.cookies.get("auth_token")?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = String(payload.role || "").toUpperCase();

        if (role === "MECHANIC" || role === "MECANICO") {
          return NextResponse.redirect(new URL("/app/taller/hoja-ruta", request.url));
        } else if (role === "RECEPTION" || role === "RECEPCION") {
          return NextResponse.redirect(new URL("/app/ordenes", request.url));
        } else {
          return NextResponse.redirect(new URL("/app/dashboard", request.url));
        }
      } catch {
        // Token corrupto o expirado, permitir acceso al formulario de login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
