/**
 * Utilidades centralizadas para búsquedas insensibles a mayúsculas, minúsculas y tildes/acentos.
 */

/**
 * Normaliza una cadena de texto para comparaciones de búsqueda:
 * - Convierte a string seguro.
 * - Descompone y elimina acentos/tildes y diacríticos diacríticos (á->a, é->e, í->i, ó->o, ú->u, ü->u, ñ->n).
 * - Convierte todo a minúsculas.
 * - Elimina espacios innecesarios en los extremos.
 */
export function normalizeForSearch(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Comprueba si uno o más campos objetivo coinciden con el término de búsqueda.
 * El término de búsqueda se divide en tokens para permitir coincidencias multitermino
 * (por ejemplo "peugeot 208" o "perez juan"), y cada token debe estar presente en el conjunto de campos.
 *
 * Es 100% insensible a mayúsculas, minúsculas y tildes.
 */
export function matchesSearchMulti(
  combinedTarget: (string | number | null | undefined)[] | string | number | null | undefined,
  query: string | number | null | undefined
): boolean {
  if (query === null || query === undefined) return true;
  const q = normalizeForSearch(query);
  if (!q) return true;

  const targetStr = Array.isArray(combinedTarget)
    ? combinedTarget.map((t) => normalizeForSearch(t)).join(" ")
    : normalizeForSearch(combinedTarget);

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  return tokens.every((token) => targetStr.includes(token));
}
