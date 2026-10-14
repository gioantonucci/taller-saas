import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { UserSession } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-auto-taller-saas-2026-secure-random"
);

const COOKIE_NAME = "auth_token";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function normalizeRole(role: string): "ADMIN" | "RECEPTION" | "MECHANIC" {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "RECEPTION" || r === "RECEPCION") return "RECEPTION";
  if (r === "MECHANIC" || r === "MECANICO") return "MECHANIC";
  return "RECEPTION";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      nombre: payload.nombre as string,
      apellido: (payload.apellido as string) || null,
      role: normalizeRole(payload.role as string),
      tenantId: (payload.tenantId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return { success: false, error: "Credenciales inválidas" };
  }

  if (user.status !== "ACTIVE") {
    return { success: false, error: "Esta cuenta se encuentra inactiva. Contacte al administrador." };
  }

  // Verificar si la cuenta está temporalmente bloqueada por fuerza bruta
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockoutUntil.getTime() - Date.now()) / (1000 * 60)
    );
    return {
      success: false,
      error: `Cuenta bloqueada temporalmente por seguridad. Intente nuevamente en ${minutesLeft} minutos.`,
    };
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    const newFailedAttempts = user.failedAttempts + 1;
    let lockoutUntil: Date | null = null;

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newFailedAttempts,
        lockoutUntil,
      },
    });

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      return {
        success: false,
        error: `Ha superado el límite de 5 intentos fallidos. Su cuenta ha sido bloqueada por ${LOCKOUT_MINUTES} minutos.`,
      };
    }

    return {
      success: false,
      error: `Contraseña incorrecta. Intentos restantes: ${MAX_FAILED_ATTEMPTS - newFailedAttempts}`,
    };
  }

  // Resetear intentos fallidos tras login exitoso
  if (user.failedAttempts > 0 || user.lockoutUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockoutUntil: null,
      },
    });
  }

  const session: UserSession = {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    role: normalizeRole(user.role),
    tenantId: user.tenantId || null,
  };

  const token = await signToken(session);

  return {
    success: true,
    user: session,
    token,
  };
}
