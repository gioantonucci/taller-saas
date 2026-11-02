export type NormalizedRole = "ADMIN" | "RECEPTION" | "MECHANIC";

/**
 * Función utilitaria pura para normalizar roles de usuario.
 * Es segura para importar tanto en Server Components como en Client Components ("use client"),
 * evitando importar módulos dependientes de Node.js o next/headers en el navegador.
 */
export function normalizeRole(role: string | null | undefined): NormalizedRole {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "RECEPTION" || r === "RECEPCION") return "RECEPTION";
  if (r === "MECHANIC" || r === "MECANICO") return "MECHANIC";
  return "RECEPTION";
}
