import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PeritajeIngreso } from "@/types";

// ─── Colores (RGB) ────────────────────────────────────────────────────────────
const C = {
  slate900:  [15,  23,  42]  as [number,number,number],
  slate800:  [30,  41,  59]  as [number,number,number],
  slate700:  [51,  65,  85]  as [number,number,number],
  slate600:  [71,  85, 105]  as [number,number,number],
  slate400:  [148,163,184]   as [number,number,number],
  slate200:  [226,232,240]   as [number,number,number],
  slate100:  [241,245,249]   as [number,number,number],
  slate50:   [248,250,252]   as [number,number,number],
  white:     [255,255,255]   as [number,number,number],
  rose600:   [225, 29,  72]  as [number,number,number],
  rose100:   [255,228,230]   as [number,number,number],
  rose50:    [255,241,242]   as [number,number,number],
  amber600:  [217,119,  6]   as [number,number,number],
  amber100:  [254,243,199]   as [number,number,number],
  amber50:   [255,251,235]   as [number,number,number],
  sky600:    [ 2, 132,199]   as [number,number,number],
  sky50:     [240,249,255]   as [number,number,number],
  indigo600: [79,  70,229]   as [number,number,number],
  emerald600:[5,  150,105]   as [number,number,number],
  emerald100:[209,250,229]   as [number,number,number],
  emerald50: [236,253,245]   as [number,number,number],
};

export interface ActaPeritajeParams {
  numeroOrden: number;
  vehiculo: {
    marca: string;
    modelo: string;
    anio: number;
    patente: string;
    color?: string;
  };
  cliente: {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email?: string;
  };
  peritaje: PeritajeIngreso;
  tallerNombre?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setFont(doc: jsPDF, style: "bold" | "normal" | "italic", size: number, color: [number,number,number]) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function pill(doc: jsPDF, x: number, y: number, w: number, h: number, bg: [number,number,number], border: [number,number,number]) {
  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");
}

function sectionHeader(doc: jsPDF, y: number, label: string, accent: [number,number,number]) {
  doc.setFillColor(...accent);
  doc.rect(14, y, 4, 7, "F");
  setFont(doc, "bold", 9.5, C.slate900);
  doc.text(label, 21, y + 5.5);
  doc.setDrawColor(...C.slate200);
  doc.line(14, y + 8, 196, y + 8);
  return y + 12;
}

function checkBadge(doc: jsPDF, x: number, y: number, ok: boolean, trueLabel: string, falseLabel: string, trueColor: [number,number,number] = C.rose600, falseColor: [number,number,number] = C.emerald600) {
  const label = ok ? trueLabel : falseLabel;
  const color = ok ? trueColor : falseColor;
  const bg    = ok ? (trueColor === C.rose600 ? C.rose50 : C.amber50) : C.emerald50;
  const border= ok ? (trueColor === C.rose600 ? C.rose100 : C.amber100) : C.emerald100;
  const w = doc.getStringUnitWidth(label) * 8 / doc.internal.scaleFactor + 5;
  pill(doc, x, y - 4, w, 5.5, bg, border);
  setFont(doc, "bold", 7, color);
  doc.text(label, x + 2.5, y);
  return w;
}

/**
 * Genera el Acta Legal de Peritaje y Constatación de Ingreso Vehicular.
 * Fiel reflejo del modal PeritajeIngresoModal con sus 4 pestañas.
 */
export function buildActaPeritajeDoc(params: ActaPeritajeParams): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { numeroOrden, vehiculo, cliente, peritaje, tallerNombre } = params;
  const taller = tallerNombre || "POGGI Taller Integral";
  const PAGE_W = 210;
  const MARGIN = 14;
  const COL = (PAGE_W - 2 * MARGIN) / 2; // ~91mm cada columna

  // ═══════════════════════════════════════════════════════════════════════════
  // CABECERA – Estilo del modal (fondo slate-900/indigo gradiente)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...C.slate900);
  doc.rect(0, 0, PAGE_W, 42, "F");

  // Acento indigo lateral
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, 6, 42, "F");

  setFont(doc, "bold", 13, C.white);
  doc.text("ACTA DE PERITAJE Y CONSTATACIÓN DE INGRESO", MARGIN + 4, 13);

  setFont(doc, "normal", 8, [148,163,184]);
  doc.text(taller, MARGIN + 4, 20);
  doc.text(`Orden #${numeroOrden}  ·  ${peritaje.fechaHoraPeritaje || new Date().toLocaleString("es-AR")}`, MARGIN + 4, 26);

  // Badge "DOCUMENTO LEGAL SELLADO"
  pill(doc, PAGE_W - 65, 15, 52, 7, [79,70,229,0.15] as any, C.indigo600);
  setFont(doc, "bold", 6.5, [165,180,252]);
  doc.text("🔒 DOCUMENTO LEGAL SELLADO", PAGE_W - 63, 20);

  // Patente
  pill(doc, PAGE_W - 47, 27, 33, 8, C.amber100, C.amber600);
  setFont(doc, "bold", 10, C.amber600);
  doc.text(vehiculo.patente, PAGE_W - 42, 33);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1 – DATOS DE VEHÍCULO Y CLIENTE (fondo slate-50)
  // ═══════════════════════════════════════════════════════════════════════════
  let y = 48;
  doc.setFillColor(...C.slate50);
  doc.rect(MARGIN, y, PAGE_W - 2*MARGIN, 28, "F");
  doc.setDrawColor(...C.slate200);
  doc.rect(MARGIN, y, PAGE_W - 2*MARGIN, 28, "D");

  // Columna izquierda – Vehículo
  setFont(doc, "bold", 7, C.sky600);
  doc.text("VEHÍCULO", MARGIN + 3, y + 6);
  setFont(doc, "bold", 9.5, C.slate900);
  doc.text(`${vehiculo.marca} ${vehiculo.modelo}`, MARGIN + 3, y + 12);
  setFont(doc, "normal", 8, C.slate600);
  doc.text(`Año ${vehiculo.anio}  ·  Color: ${vehiculo.color || "S/D"}`, MARGIN + 3, y + 18);

  // Odómetro y Combustible
  const km = peritaje.kilometrajeTablero ? `${peritaje.kilometrajeTablero.toLocaleString("es-AR")} km` : "No registrado";
  setFont(doc, "normal", 7.5, C.slate600);
  doc.text("Km al ingresar:", MARGIN + 3, y + 24);
  setFont(doc, "bold", 7.5, C.slate900);
  doc.text(km, MARGIN + 30, y + 24);

  // Nivel de combustible – barra visual
  const FUEL_LEVELS = ["VACIO", "1/4", "1/2", "3/4", "LLENO"];
  const fuelIdx = FUEL_LEVELS.indexOf(peritaje.nivelCombustible ?? "1/2");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate600);
  doc.text("Combustible:", MARGIN + 3, y + 30);

  FUEL_LEVELS.forEach((lvl, i) => {
    const bx = MARGIN + 28 + i * 12;
    const active = i <= fuelIdx;
    doc.setFillColor(...(active ? C.amber600 : C.slate200));
    doc.setDrawColor(...(active ? C.amber600 : C.slate200));
    doc.roundedRect(bx, y + 26.5, 10, 4.5, 0.8, 0.8, "FD");
    setFont(doc, "bold", 5.5, active ? C.white : C.slate400);
    doc.text(lvl, bx + 1, y + 30);
  });

  // Columna derecha – Cliente
  const cx = MARGIN + COL + 3;
  setFont(doc, "bold", 7, C.slate600);
  doc.text("PROPIETARIO / CLIENTE", cx, y + 6);
  setFont(doc, "bold", 9.5, C.slate900);
  doc.text(`${cliente.nombre} ${cliente.apellido}`, cx, y + 12);
  setFont(doc, "normal", 7.5, C.slate600);
  doc.text(`DNI / CUIT: ${cliente.dni}`, cx, y + 18);
  doc.text(`Tel: ${cliente.telefono || "S/D"}`, cx, y + 23);
  if (cliente.email) doc.text(`Email: ${cliente.email}`, cx, y + 28);

  // Mecánico peritador (abajo a la derecha)
  setFont(doc, "bold", 7, C.slate600);
  doc.text("Mecánico peritador:", cx, y + 34);
  setFont(doc, "bold", 8, C.slate900);
  doc.text(peritaje.peritadorNombre || "Mecánico del Taller", cx + 34, y + 34);

  y += 36;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2 – TABLERO: ODÓMETRO Y LUCES TESTIGO
  // (equivale a la Pestaña 1 del modal)
  // ═══════════════════════════════════════════════════════════════════════════
  y += 4;
  y = sectionHeader(doc, y, "1. TABLERO – TESTIGOS LUMÍNICOS PREEXISTENTES", C.rose600);

  const testigosMap: { key: keyof typeof peritaje.lucesTestigo; label: string }[] = [
    { key: "checkEngine",       label: "Check Engine (Motor)" },
    { key: "abs",               label: "ABS (Frenos)" },
    { key: "airbag",            label: "Airbag" },
    { key: "presionAceite",     label: "Presión de Aceite" },
    { key: "temperatura",       label: "Temperatura / Agua" },
    { key: "bateria",           label: "Batería / Carga" },
    { key: "frenoManoDesgaste", label: "Pastillas Desgastadas" },
    { key: "direccionAsistida", label: "Dirección Asistida (EPS)" },
  ];

  const encendidos = testigosMap.filter(t => peritaje.lucesTestigo?.[t.key]);
  const apagados   = testigosMap.filter(t => !peritaje.lucesTestigo?.[t.key]);

  // Grid 4 columnas de testigos
  const COLS = 4;
  const cellW = (PAGE_W - 2*MARGIN) / COLS;
  testigosMap.forEach(({ key, label }, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx2 = MARGIN + col * cellW;
    const cy  = y + row * 10;
    const isOn = Boolean(peritaje.lucesTestigo?.[key]);
    pill(doc, cx2, cy, cellW - 1, 9, isOn ? C.rose50 : C.slate50, isOn ? C.rose100 : C.slate200);
    setFont(doc, "bold", 6.8, isOn ? C.rose600 : C.slate600);
    doc.text(label, cx2 + 2, cy + 4);
    setFont(doc, "bold", 6.5, isOn ? C.rose600 : C.slate400);
    doc.text(isOn ? "🔴 ENCENDIDO" : "⚪ Apagado", cx2 + 2, cy + 8);
  });

  const gridRows = Math.ceil(testigosMap.length / COLS);
  y += gridRows * 10 + 2;

  // Otros testigos
  if (peritaje.lucesTestigo?.otrosTestigos?.trim()) {
    pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, 7, C.rose50, C.rose100);
    setFont(doc, "bold", 7, C.rose600);
    doc.text("Otros testigos: ", MARGIN + 2, y + 5);
    setFont(doc, "normal", 7, C.slate800);
    doc.text(peritaje.lucesTestigo.otrosTestigos, MARGIN + 26, y + 5);
    y += 9;
  }

  // Resumen testigos
  if (encendidos.length === 0) {
    pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, 7, C.emerald50, C.emerald100);
    setFont(doc, "bold", 7, C.emerald600);
    doc.text("✅  Todos los testigos de anomalía se encontraban APAGADOS al momento de la recepción.", MARGIN + 3, y + 5);
    y += 9;
  } else {
    pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, 7, C.rose50, C.rose100);
    setFont(doc, "bold", 7, C.rose600);
    doc.text(`⚠️  ${encendidos.length} testigo(s) ENCENDIDOS al ingresar el vehículo (fallas preexistentes al taller).`, MARGIN + 3, y + 5);
    y += 9;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3 – CARROCERÍA: DECLARACIÓN DUEÑO + DAÑOS REGISTRADOS
  // (equivale a la Pestaña 2 del modal)
  // ═══════════════════════════════════════════════════════════════════════════
  if (y > 230) { doc.addPage(); y = 15; }

  y = sectionHeader(doc, y, "2. CARROCERÍA – DECLARACIÓN DEL DUEÑO Y DAÑOS PREEXISTENTES", C.amber600);

  // Declaración del dueño – caja amber
  const decl = peritaje.comentariosDuenio?.trim() || "El cliente no declaró daños previos al momento de la recepción.";
  const declLines = doc.splitTextToSize(decl, PAGE_W - 2*MARGIN - 10);
  const declH = declLines.length * 4 + 10;
  pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, declH, C.amber50, C.amber100);
  setFont(doc, "bold", 7, C.amber600);
  doc.text("Declaración / Peritaje Inicial del Dueño:", MARGIN + 3, y + 5.5);
  setFont(doc, "italic", 7, C.slate800);
  declLines.forEach((line: string, i: number) => {
    doc.text(`"${i === 0 ? "" : ""}${line}${i === declLines.length - 1 ? "" : ""}`, MARGIN + 3, y + 10 + i * 4);
  });
  y += declH + 3;

  // Tabla de daños registrados
  const daniosData = (peritaje.daniosCarroceria || []).map((d, idx) => [
    `${idx + 1}`,
    d.zona,
    d.tipo.replace(/_/g, " "),
    d.descripcion,
  ]);

  if (daniosData.length === 0) {
    pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, 8, C.emerald50, C.emerald100);
    setFont(doc, "bold", 7.5, C.emerald600);
    doc.text("✅  Sin golpes, abolladuras ni rayones significativos registrados en la carrocería.", MARGIN + 3, y + 5.5);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["#", "Zona de Carrocería", "Tipo de Daño", "Descripción Detallada"]],
      body: daniosData,
      theme: "grid",
      headStyles: {
        fillColor: C.slate900,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: C.slate800,
      },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: {
        0: { cellWidth: 6, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 48 },
        2: { cellWidth: 40 },
        3: { cellWidth: "auto" },
      },
    });
    // @ts-ignore
    y = (doc.lastAutoTable?.finalY || y) + 3;
  }

  // Pines de daño (damage pins) si hay
  if ((peritaje.damagePins?.length || 0) > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    setFont(doc, "bold", 7.5, C.slate600);
    doc.text(`Pines de daño marcados en el esquema del auto: ${peritaje.damagePins!.length}`, MARGIN, y + 4);
    const pinsData = peritaje.damagePins!.map((p, i) => [
      `${i + 1}`,
      p.tipo.replace(/_/g, " "),
      p.severidad || "LEVE",
      p.descripcion || "–",
      `X: ${p.x.toFixed(1)}%  Y: ${p.y.toFixed(1)}%`,
    ]);
    autoTable(doc, {
      startY: y + 7,
      head: [["#", "Tipo", "Severidad", "Descripción", "Coordenadas (Esquema)"]],
      body: pinsData,
      theme: "plain",
      headStyles: { fillColor: C.slate800, textColor: C.white, fontSize: 7, fontStyle: "bold", cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.slate600 },
      columnStyles: {
        0: { cellWidth: 6, halign: "center" },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 38 },
      },
    });
    // @ts-ignore
    y = (doc.lastAutoTable?.finalY || y) + 3;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4 – CRISTALES, ÓPTICAS E INVENTARIO DE CABINA
  // (equivale a la Pestaña 3 del modal)
  // ═══════════════════════════════════════════════════════════════════════════
  if (y > 225) { doc.addPage(); y = 15; }
  y = sectionHeader(doc, y, "3. CRISTALES, ÓPTICAS E INVENTARIO RECIBIDO EN CABINA", C.sky600);

  // Cristales (4 ítems, 2 por fila)
  const cristalItems = [
    { key: "parabrisasRajado",         label: "Parabrisas Rajado o con Picaduras",         danado: peritaje.cristalesYOpticas?.parabrisasRajado },
    { key: "opticasDelanterasDanadas", label: "Ópticas Delanteras Quebradas o Empañadas",  danado: peritaje.cristalesYOpticas?.opticasDelanterasDanadas },
    { key: "farosTraserosRotos",       label: "Faros / Micas Traseras Rotas",              danado: peritaje.cristalesYOpticas?.farosTraserosRotos },
    { key: "espejosRetrovisoresRotos", label: "Vidrios de Espejos Retrovisores Rotos",     danado: peritaje.cristalesYOpticas?.espejosRetrovisoresRotos },
  ];

  const crisColW = (PAGE_W - 2*MARGIN - 2) / 2;
  cristalItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx2 = MARGIN + col * (crisColW + 2);
    const cy  = y + row * 9;
    const bg     = item.danado ? C.rose50 : C.emerald50;
    const border = item.danado ? C.rose100 : C.emerald100;
    pill(doc, cx2, cy, crisColW, 8, bg, border);
    setFont(doc, "normal", 7, C.slate700 as any);
    doc.text(item.label, cx2 + 3, cy + 4);
    const statusLabel = item.danado ? "⚠ DAÑADO" : "✓ SANO";
    const statusColor = item.danado ? C.rose600 : C.emerald600;
    setFont(doc, "bold", 6.5, statusColor);
    doc.text(statusLabel, cx2 + crisColW - 20, cy + 5.5);
  });

  y += Math.ceil(cristalItems.length / 2) * 9 + 3;

  // Inventario de cabina (7 ítems)
  const inventarioItems = [
    { label: "Rueda de Auxilio",    ok: peritaje.inventarioCabina?.ruedaAuxilio },
    { label: "Crique y Llave",      ok: peritaje.inventarioCabina?.criqueYHerramientas },
    { label: "Tuerca Antirrobo",    ok: peritaje.inventarioCabina?.tuercaSeguridad },
    { label: "Cédula / Documentos", ok: peritaje.inventarioCabina?.documentacion },
    { label: "Estéreo / Pantalla",  ok: peritaje.inventarioCabina?.estereoFunciona },
    { label: "Matafuego en regla",  ok: peritaje.inventarioCabina?.matafuegoVigente },
    { label: "Tapa Combustible",    ok: peritaje.inventarioCabina?.tapaCombustible },
  ];

  setFont(doc, "bold", 7, C.slate700 as any);
  doc.text("Accesorios y Elementos Recibidos en Cabina / Baúl:", MARGIN, y + 4);
  y += 7;

  const INVCOLS = 4;
  const invW = (PAGE_W - 2*MARGIN) / INVCOLS;
  inventarioItems.forEach((item, i) => {
    const col = i % INVCOLS;
    const row = Math.floor(i / INVCOLS);
    const ix = MARGIN + col * invW;
    const iy = y + row * 9;
    const bg     = item.ok ? C.emerald50 : C.slate100;
    const border = item.ok ? C.emerald100 : C.slate200;
    pill(doc, ix, iy, invW - 1, 8, bg, border);
    setFont(doc, "bold", 7, item.ok ? C.emerald600 : C.slate400);
    doc.text(item.ok ? "✓" : "✗", ix + 2, iy + 5.5);
    setFont(doc, "normal", 6.8, item.ok ? C.slate800 : C.slate400);
    doc.text(item.label, ix + 7, iy + 5.5);
  });

  y += Math.ceil(inventarioItems.length / INVCOLS) * 9 + 4;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5 – OBSERVACIONES GENERALES (Pestaña 3 del modal)
  // ═══════════════════════════════════════════════════════════════════════════
  const obs = peritaje.observacionesGenerales?.trim();
  if (obs) {
    if (y > 245) { doc.addPage(); y = 15; }
    y = sectionHeader(doc, y, "4. OBSERVACIONES TÉCNICAS DEL VEHÍCULO", C.indigo600);
    const obsLines = doc.splitTextToSize(obs, PAGE_W - 2*MARGIN - 8);
    const obsH = obsLines.length * 4 + 8;
    pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, obsH, C.sky50, C.slate200);
    setFont(doc, "normal", 7.5, C.slate800);
    obsLines.forEach((line: string, i: number) => {
      doc.text(line, MARGIN + 4, y + 5.5 + i * 4);
    });
    y += obsH + 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLÁUSULA LEGAL + FIRMAS
  // ═══════════════════════════════════════════════════════════════════════════
  if (y > 230) { doc.addPage(); y = 15; }

  // Cláusula
  pill(doc, MARGIN, y, PAGE_W - 2*MARGIN, 20, C.slate50, C.slate200);
  setFont(doc, "bold", 7, C.slate800);
  doc.text("CLÁUSULA DE CONFORMIDAD PROBATORIA", MARGIN + 3, y + 5.5);
  setFont(doc, "italic", 6.5, C.slate600);
  const clausula = [
    "Las partes dejan expresa constancia de que los daños, golpes, testigos lumínicos y faltantes arriba consignados",
    "preexistían al ingreso del vehículo en las instalaciones del taller. El taller no se responsabiliza por fallas o",
    "roturas preexistentes debidamente constatadas en la presente acta digital con soporte fotográfico inalterable.",
  ];
  clausula.forEach((line, i) => doc.text(line, MARGIN + 3, y + 10.5 + i * 4));
  y += 24;

  // Líneas de firma
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setDrawColor(...C.slate400);
  doc.line(MARGIN + 5,      y + 20, MARGIN + 85,     y + 20);
  doc.line(MARGIN + COL + 10, y + 20, PAGE_W - MARGIN - 5, y + 20);

  setFont(doc, "bold", 7.5, C.slate600);
  doc.text("Firma y Sello del Mecánico Peritador", MARGIN + 5, y + 25);
  doc.text("Firma de Conformidad del Cliente / Propietario", MARGIN + COL + 10, y + 25);

  setFont(doc, "normal", 7, C.slate400);
  doc.text(`Mecánico: ${peritaje.peritadorNombre || "– – – – – – – – –"}`, MARGIN + 5, y + 30);
  doc.text(`Cliente: ${cliente.nombre} ${cliente.apellido}`, MARGIN + COL + 10, y + 30);

  // Pie de página
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setFont(doc, "normal", 6, C.slate400);
    doc.text(
      `Orden #${numeroOrden} · ${taller} · Generado el ${new Date().toLocaleString("es-AR")} · Pág. ${p}/${totalPages}`,
      PAGE_W / 2,
      295,
      { align: "center" }
    );
    doc.setDrawColor(...C.slate200);
    doc.line(MARGIN, 292, PAGE_W - MARGIN, 292);
  }

  return doc;
}

export function getActaPeritajeBlob(params: ActaPeritajeParams): {
  doc: jsPDF;
  blob: Blob;
  blobUrl: string;
  fileName: string;
} {
  const doc = buildActaPeritajeDoc(params);
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const fileName = `Acta_Peritaje_Ingreso_${params.numeroOrden}_${params.vehiculo.patente.replace(/\s+/g, "_")}.pdf`;
  return { doc, blob, blobUrl, fileName };
}

export function generateActaPeritajePDF(params: ActaPeritajeParams): void {
  const doc = buildActaPeritajeDoc(params);
  doc.save(`Acta_Peritaje_Ingreso_${params.numeroOrden}_${params.vehiculo.patente.replace(/\s+/g, "_")}.pdf`);
}
