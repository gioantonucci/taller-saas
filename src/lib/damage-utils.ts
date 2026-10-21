/**
 * Utilidades para cálculo de zonas y etiquetas de daños en esquemas de vehículos.
 */

export function estimateZone(x: number, y: number): string {
  let vertical = "Medio";
  if (y < 20) vertical = "Paragolpe / Frente Delantero";
  else if (y < 35) vertical = "Capot / Ópticas Delanteras";
  else if (y < 48) vertical = "Parabrisas / Techo Delantero";
  else if (y < 65) vertical = "Techo Central / Cabina";
  else if (y < 80) vertical = "Luneta Trasera / Techo Trasero";
  else if (y < 90) vertical = "Baúl / Portón Trasero";
  else vertical = "Paragolpe Trasero";

  let horizontal = "Centro";
  if (x < 32) horizontal = "Lateral Izquierdo (Conductor)";
  else if (x > 68) horizontal = "Lateral Derecho (Acompañante)";

  return `${vertical} • ${horizontal}`;
}

export function getDamageTypeLabel(tipo?: string | null): string {
  switch (tipo?.toUpperCase()) {
    case "RAYON":
      return "Rayón / Raspón";
    case "ABOLLADURA":
      return "Abolladura / Golpe";
    case "ROTURA":
      return "Rotura / Fisura";
    case "PINTURA":
      return "Pintura Saltada";
    default:
      return tipo || "Daño";
  }
}
