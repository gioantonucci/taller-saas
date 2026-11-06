import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveStorageFile } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";
import path from "path";

// Función heurística de extracción para comprobantes, remitos, albaranes y facturas de recambios
function parseInvoiceText(rawText: string, _fileName: string = "") {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: Array<{
    nombreRepuesto: string;
    codigo: string;
    cantidad: number;
    categoria: string;
    precioVenta: number;
  }> = [];

  for (const line of lines) {
    // Si la línea es encabezado de tabla o datos generales, ignorar
    if (/^(ítems?|items?|descripci[oó]n|cantidad|precio|total|subtotal|c[oó]digo|albar[aá]n|factura|n[uú]m|ref|referencia|concepto|iva|base)/i.test(line)) {
      continue;
    }

    // Buscar precios: ej. "45,50 €", "28.00", "€ 120,00", "EUR 35"
    const priceMatch = line.match(/(?:€|\bEUR|\$)?\s*([0-9]{1,4}(?:[.,][0-9]{2})?)\s*(?:€|\bEUR)?/);
    
    // Palabras clave automotrices y de recambios
    const isAutoPartKeyword = /filtro|aceite|pastilla|disco|correa|bomba|bujia|bujía|amortiguador|optica|óptica|faro|embrague|reten|retén|manguera|bateria|batería|liquido|líquido|sensor|bobina|crapodina|rotula|rótula|extremo|cremallera|radiador|termostato|junta|distribucion|distribución|anticongelante|refrigerante|valvula|válvula|silencioso|escape|polea|tensor|brazo|suspension|suspensión|freno|frenos|neumatico|neumático|cubierta|rodamiento|cojinete/i.test(line);

    // Patrón de fila de albarán/factura: ej. "2 | Pastillas de freno | BOS-PD1422"
    const tableRowMatch = line.match(/^(?:(?:\d+[\.\)]|\d+x?|\#\d+)\s*\|?\s*)?([A-Za-záéíóúñÁÉÍÓÚÑ\s\-_\/0-9]{3,40})/i);

    if (isAutoPartKeyword || (line.length > 5 && priceMatch) || tableRowMatch) {
      // Extraer cantidad (ej. "2x", "Cant: 2", "2 UN", "2 uds", "4 u")
      let cantidad = 1;
      const qtyMatch = line.match(/(?:^|\s)(\d+)(?:\s*(?:x|un|cant|uds?|unidades?|piezas?|u))\b/i) || line.match(/^(\d+)\s+/);
      if (qtyMatch) {
        const parsedQty = parseInt(qtyMatch[1], 10);
        if (!isNaN(parsedQty) && parsedQty > 0 && parsedQty < 500) {
          cantidad = parsedQty;
        }
      }

      // Detectar precio
      let precioVenta = 35; // Precio estimado base en euros
      if (priceMatch) {
        const cleanPrice = priceMatch[1].replace(",", ".");
        const parsed = parseFloat(cleanPrice);
        if (!isNaN(parsed) && parsed > 0 && parsed < 5000) {
          precioVenta = Math.round(parsed * 1.35 * 100) / 100; // margen sugerido PVP
        }
      }

      // Extraer código o referencia de pieza (ej. "MANN-W712", "BOS-PD1422", "K015569", "7701477028")
      const codeMatch = line.match(/\b([A-Z0-9]{2,8}-[A-Z0-9]{2,8}|[A-Z0-9]{6,12})\b/);
      const codigo = codeMatch ? codeMatch[1].toUpperCase() : `REC-${Math.floor(1000 + Math.random() * 9000)}`;

      // Limpiar nombre del repuesto / descripción
      let nombreRepuesto = line
        .replace(codeMatch ? codeMatch[0] : "", "")
        .replace(/(?:€|\bEUR|\$)?\s*([0-9]{1,4}(?:[.,][0-9]{2})?)\s*(?:€|\bEUR)?/g, "")
        .replace(/(?:^|\s)\d+\s*(?:x|un|cant|uds?|unidades?|piezas?|u)\b/gi, "")
        .replace(/^[\d\.\-\|#\)]+\s*/, "")
        .replace(/[|–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (nombreRepuesto.length < 3 && tableRowMatch) {
        nombreRepuesto = tableRowMatch[1].trim();
      }

      // Detectar categoría sugerida
      let categoria = "Mecánica General";
      const lower = (nombreRepuesto + " " + line).toLowerCase();
      if (/freno|pastilla|disco|liquido de freno/i.test(lower)) {
        categoria = "Frenos";
      } else if (/filtro/i.test(lower)) {
        categoria = "Filtros";
      } else if (/aceite|anticongelante|refrigerante|valvul|liquido/i.test(lower)) {
        categoria = "Fluidos";
      } else if (/correa|distribucion|distribución|bomba|tensor|polea|junta|valvula|termostato/i.test(lower)) {
        categoria = "Motor";
      } else if (/amortiguador|brazo|rotula|rótula|suspension|suspensión/i.test(lower)) {
        categoria = "Suspensión";
      } else if (/bateria|batería|bujia|bujía|bobina|sensor|faro|optica|óptica/i.test(lower)) {
        categoria = "Electricidad";
      }

      if (nombreRepuesto.length >= 3 && !/^(total|subtotal|fecha|recib[ií]|responsable|cif|nif|direcci[oó]n|albar[aá]n|cliente|taller)/i.test(nombreRepuesto)) {
        items.push({
          nombreRepuesto: nombreRepuesto.charAt(0).toUpperCase() + nombreRepuesto.slice(1),
          codigo,
          cantidad: cantidad > 0 ? cantidad : 1,
          categoria,
          precioVenta,
        });
      }
    }
  }

  return items;
}

// Ejecución ultra-segura de Tesseract usando modelos locales pre-descargados (offline, sin red)
async function safeRecognizeWithTesseract(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false;

    // Timeout de seguridad: 15 segundos
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    }, 15000);

    (async () => {
      try {
        const tessdataPath = path.resolve(process.cwd(), "tessdata");
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("spa", 1, {
          langPath: tessdataPath,
          cachePath: tessdataPath,
          gzip: true,
          errorHandler: () => {},
        });
        const ret = await worker.recognize(buffer);
        await worker.terminate();

        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(ret?.data?.text || "");
        }
      } catch (err) {
        console.error("Error al procesar con Tesseract OCR:", err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve("");
        }
      }
    })();
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const manualText = (formData.get("text") as string) || "";
    const clientOcrText = (formData.get("clientOcrText") as string) || "";

    let fileUrl = "";
    let extractedText = manualText || clientOcrText;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await saveStorageFile(buffer, file.name, "remitos");
      fileUrl = uploadResult.url;

      // Si no viene texto reconocido desde el cliente, intentar Tesseract con timeout estricto
      if (!extractedText) {
        const ocrText = await safeRecognizeWithTesseract(buffer);
        if (ocrText && ocrText.trim().length > 5) {
          extractedText = ocrText;
        }
      }
    }

    const items = parseInvoiceText(extractedText, file?.name || "");

    await recordAuditLog({
      user: session,
      accion: "OCR_SCAN",
      entidad: "Parts",
      entidadAfectada: "Parts",
      detallesCambio: {
        fileName: file?.name || "Entrada manual",
        itemsCount: items.length,
        fileUrl,
        itemsSummary: items.slice(0, 5).map((i) => `${i.nombreRepuesto} (${i.cantidad} u.)`),
        descripcion: `Escaneo OCR de comprobante '${file?.name || "manual"}' (${items.length} repuestos identificados)`,
      },
    });

    return NextResponse.json({
      success: true,
      fileUrl,
      rawText: extractedText.trim(),
      items,
      message: `Se reconocieron ${items.length} repuestos correctamente.`,
    });
  } catch (error: any) {
    console.error("Error en POST /api/ocr:", error);
    return NextResponse.json(
      { error: "Error al procesar el comprobante mediante OCR" },
      { status: 500 }
    );
  }
}
