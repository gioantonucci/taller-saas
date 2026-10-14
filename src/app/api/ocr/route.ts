import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveStorageFile } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";
import path from "path";

// Función heurística de extracción para comprobantes, remitos y facturas
function parseInvoiceText(rawText: string, _fileName: string = "") {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: Array<{
    nombreRepuesto: string;
    codigo: string;
    cantidad: number;
    costo: number;
    precioSugerido: number;
  }> = [];

  for (const line of lines) {
    // Si la línea es encabezado de tabla, ignorar
    if (/^(ítems?|items?|descripci[oó]n|cantidad|precio|total|subtotal|c[oó]digo|nota de entrega)/i.test(line)) {
      continue;
    }

    // Buscar precios: ej. "$ 14.500", "35000", "ARS 48.000,00"
    const priceMatch = line.match(/(?:\$|\bARS|\bUSD)?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]{2,7}(?:\.[0-9]{2})?)/);
    
    // Palabras clave automotrices
    const isAutoPartKeyword = /filtro|aceite|pastilla|disco|correa|bomba|bujia|bujía|amortiguador|optica|óptica|faro|embrague|reten|retén|manguera|bateria|batería|liquido|líquido|sensor|bobina|crapodina|rotula|rótula|extremo|cremallera|radiador|termostato|junta|distribucion|distribución/i.test(line);

    // Patrón de fila de tabla o remito: ej. "1 | Pollo | 5 kilos" o "2 Arroz 250 gramos" o "1x MANN-C25114 Filtro $ 14500"
    const tableRowMatch = line.match(/^(?:(?:\d+[\.\)]|\d+x?|\#\d+)\s*\|?\s*)?([A-Za-záéíóúñÁÉÍÓÚÑ\s\-_\/]{3,35})\s*\|?\s*(\d+(?:[.,]\d+)?)\s*(kilos?|kg|g|gramos|litros?|lts?|unidades?|un|uds?|piezas?|x)?/i);

    if (isAutoPartKeyword || (line.length > 6 && priceMatch) || tableRowMatch) {
      // Extraer cantidad (ej. "2x", "Cant: 2", "2 UN", "5 kilos")
      let cantidad = 1;
      const qtyMatch = line.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s*(?:x|un|cant|uds?|unidades?|kilos?|kg|g|gramos|litros?|lts?))?\b/i);
      if (qtyMatch) {
        const parsedQty = parseFloat(qtyMatch[1].replace(",", "."));
        if (!isNaN(parsedQty) && parsedQty > 0 && parsedQty < 1000) {
          cantidad = Math.round(parsedQty);
        }
      }

      // Limpiar precio numérico
      let costo = 22000;
      if (priceMatch) {
        const cleanPrice = priceMatch[1].replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(cleanPrice);
        if (!isNaN(parsed) && parsed > 50) {
          costo = parsed;
        }
      }

      // Extraer código si existe (ej. "MANN-C25114", "FRA-PD1422", etc.)
      const codeMatch = line.match(/\b([A-Z0-9]{3,}-[A-Z0-9]{2,})\b/i);
      const codigo = codeMatch ? codeMatch[1].toUpperCase() : `REP-${Math.floor(1000 + Math.random() * 9000)}`;

      // Limpiar nombre del repuesto / ítem
      let nombreRepuesto = line
        .replace(codeMatch ? codeMatch[0] : "", "")
        .replace(/(?:\$|\bARS|\bUSD)?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]{2,7}(?:\.[0-9]{2})?)/g, "")
        .replace(/(?:^|\s)\d+(?:[.,]\d+)?\s*(?:x|un|cant|uds?|unidades?|kilos?|kg|g|gramos|litros?|lts?)\b/gi, "")
        .replace(/^[\d\.\-\|#\)]+\s*/, "")
        .replace(/[|–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (nombreRepuesto.length < 3 && tableRowMatch) {
        nombreRepuesto = tableRowMatch[1].trim();
      }

      if (nombreRepuesto.length >= 3 && !/^(total|subtotal|fecha|recib[ií]|responsable|empresa)/i.test(nombreRepuesto)) {
        const precioSugerido = Math.round(costo * 1.45);
        items.push({
          nombreRepuesto: nombreRepuesto.charAt(0).toUpperCase() + nombreRepuesto.slice(1),
          codigo,
          cantidad: cantidad > 0 ? cantidad : 1,
          costo,
          precioSugerido,
        });
      }
    }
  }

  return items;
}

// Ejecución ultra-segura de Tesseract con límite de tiempo estricto (1.8s) para nunca congelar
async function safeRecognizeWithTesseract(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false;

    // Timeout de seguridad: si no responde en 1800ms, salir inmediatamente
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    }, 1800);

    (async () => {
      try {
        const workerScript = path.resolve(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js");
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("spa", 1, {
          workerPath: workerScript,
          errorHandler: () => {},
        });
        const ret = await worker.recognize(buffer);
        await worker.terminate();

        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(ret?.data?.text || "");
        }
      } catch {
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
        itemsSummary: items.slice(0, 5).map((i) => `${i.nombreRepuesto} ($${i.costo})`),
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
