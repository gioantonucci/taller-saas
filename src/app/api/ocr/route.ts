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
  const seen = new Set<string>();

  for (const line of lines) {
    // Descartar encabezados, metadatos de empresa, direcciones o líneas triviales
    if (
      line.length < 4 ||
      /^(albar[aá]n|factura|fecha|p[aá]gina|tel|obra|pedido|pesido|paso|n[uú]m|c\/|ctra|cif|nif|total|subtotal|base|iva|banco|iban|vivienda|madera|productor|compactos|\d+$|=)/i.test(line) ||
      /\b(alicante|madrid|barcelona|valencia|sevilla|s\.l\.|s\.a\.|c\.v\.|autovia|avenida|calle)\b/i.test(line)
    ) {
      continue;
    }

    let codigo = "";
    let nombreRepuesto = "";
    let cantidad = 1;
    let precioVenta = 0;

    // PATRÓN 1: Formato con separación por barra o pipe (ej. "COMALU | 100 COMPACTO ...")
    const pipeMatch = line.match(/^([A-Z0-9\-_]{2,15})\s*\|\s*(.*)$/i);
    if (pipeMatch) {
      codigo = pipeMatch[1].trim().toUpperCase();
      let rest = pipeMatch[2].trim();

      const qtyMatch = rest.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|uds?|ud|unidades?|piezas?|u\b)?\s+(.*)$/i);
      if (qtyMatch) {
        let qVal = parseFloat(qtyMatch[1].replace(",", "."));
        // En muchos albaranes españoles 100 representa 1.00 ud, 300 = 3.00, etc.
        if (qVal >= 100 && qVal % 100 === 0 && qVal <= 5000) {
          qVal = qVal / 100;
        } else if (qVal > 500) {
          qVal = 1;
        }
        cantidad = Math.max(1, Math.round(qVal));
        rest = qtyMatch[2].trim();
      }

      const priceEndMatch = rest.match(/([0-9]{1,4}(?:[.,][0-9]{2}))\s*(?:€|\bEUR)?$/i);
      if (priceEndMatch) {
        const rawP = parseFloat(priceEndMatch[1].replace(",", "."));
        if (!isNaN(rawP) && rawP > 0) {
          precioVenta = Math.round(rawP * 100) / 100;
        }
      }

      nombreRepuesto = rest
        .replace(/^[¡!]/, "")
        .replace(/\d+([.,]\d+)?\s*(?:x\s*\d+|m2|ud|uds|kg|cm|mm).*$/i, "")
        .replace(/\d+([.,]\d+)?\s*%/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!nombreRepuesto || nombreRepuesto.length < 3) {
        nombreRepuesto = rest.split(/\d{2,}/)[0].replace(/^[¡!]/, "").trim();
      }
    } else {
      // PATRÓN 2: Línea tabular estándar de recambio / factura
      const isAutoPartKeyword = /filtro|aceite|pastilla|disco|correa|bomba|bujia|bujía|amortiguador|optica|óptica|faro|embrague|reten|retén|manguera|bateria|batería|liquido|líquido|sensor|bobina|crapodina|rotula|rótula|extremo|cremallera|radiador|termostato|junta|distribucion|distribución|anticongelante|refrigerante|valvula|válvula|silencioso|escape|polea|tensor|brazo|suspension|suspensión|freno|frenos|neumatico|neumático|cubierta|rodamiento|cojinete|recambio|repuesto/i.test(line);

      const codeMatch = line.match(/\b([A-Z0-9]{2,8}[-_][A-Z0-9]{2,8}|[A-Z]{2,4}\d{4,8})\b/i);
      const priceMatch = line.match(/(?:€|\bEUR|\$)?\s*([0-9]{1,4}(?:[.,][0-9]{2}))\s*(?:€|\bEUR)?/);
      const qtyMatch = line.match(/(?:^|\s)(\d+)\s*(?:x|ud|uds|unidades?|piezas?|u)\b/i) || line.match(/^(\d+)\s+[A-Za-z]/);

      if (!isAutoPartKeyword && !(priceMatch && (codeMatch || qtyMatch))) {
        continue;
      }

      if (codeMatch) {
        codigo = codeMatch[1].toUpperCase();
      }

      if (priceMatch) {
        const rawP = parseFloat(priceMatch[1].replace(",", "."));
        if (!isNaN(rawP) && rawP > 0 && rawP < 5000) {
          precioVenta = Math.round(rawP * 100) / 100;
        }
      }

      if (qtyMatch) {
        const qVal = parseInt(qtyMatch[1], 10);
        if (!isNaN(qVal) && qVal > 0 && qVal < 500) {
          cantidad = qVal;
        }
      }

      nombreRepuesto = line
        .replace(codeMatch ? codeMatch[0] : "", "")
        .replace(/(?:€|\bEUR|\$)?\s*([0-9]{1,4}(?:[.,][0-9]{2}))\s*(?:€|\bEUR)?/g, "")
        .replace(/(?:^|\s)\d+\s*(?:x|ud|uds|unidades?|piezas?|u)\b/gi, "")
        .replace(/^[\d\.\-\|#\)]+\s*/, "")
        .replace(/[|–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (!codigo) {
      codigo = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    if (nombreRepuesto && nombreRepuesto.length >= 3) {
      nombreRepuesto = nombreRepuesto
        .replace(/\s+\d+(?:[.,]\d+)?(?:\s*[xX\/\-]?\s*\d+(?:[.,]\d+)?)*[\s\/\,\.]*$/g, "")
        .replace(/\s+[A-Za-z]$/, "")
        .replace(/[\/\,\.\-\s]+$/, "")
        .trim();

      nombreRepuesto = nombreRepuesto.charAt(0).toUpperCase() + nombreRepuesto.slice(1);

      // Categoría sugerida automática
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

      const dedupeKey = `${codigo}_${nombreRepuesto}`.toLowerCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        items.push({
          nombreRepuesto,
          codigo,
          cantidad: cantidad > 0 ? cantidad : 1,
          categoria,
          precioVenta: precioVenta > 0 ? precioVenta : 25,
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
