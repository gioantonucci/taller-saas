import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveStorageFile } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const chunk = formData.get("chunk") as File | null;
    const uploadId = (formData.get("uploadId") as string) || "";
    const chunkIndex = parseInt((formData.get("chunkIndex") as string) || "0", 10);
    const totalChunks = parseInt((formData.get("totalChunks") as string) || "1", 10);
    const fileName = (formData.get("fileName") as string) || `video-${Date.now()}.mp4`;
    const mimeType = (formData.get("mimeType") as string) || "video/mp4";
    const folder = (formData.get("folder") as string) || "multimedia";

    if (!chunk || !uploadId || totalChunks < 1) {
      return NextResponse.json(
        { error: "Datos de fragmento incompletos" },
        { status: 400 }
      );
    }

    if (folder !== "multimedia" && folder !== "remitos") {
      return NextResponse.json({ error: "Carpeta inválida" }, { status: 400 });
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const chunkId = crypto.randomUUID();

    // Guardar el fragmento en la tabla temporal _upload_chunks
    await prisma.$executeRaw`
      INSERT INTO _upload_chunks (id, upload_id, chunk_index, total_chunks, file_name, mime_type, data)
      VALUES (${chunkId}, ${uploadId}, ${chunkIndex}, ${totalChunks}, ${fileName}, ${mimeType}, ${buffer})
      ON CONFLICT (id) DO NOTHING
    `;

    // Limpieza periódica preventiva de fragmentos huérfanos con más de 2 horas
    prisma.$executeRaw`DELETE FROM _upload_chunks WHERE created_at < NOW() - INTERVAL '2 hours'`.catch(() => {});

    // Consultar cuántos fragmentos se han recibido para este uploadId
    const countResult: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM _upload_chunks WHERE upload_id = ${uploadId}
    `;
    const receivedCount = countResult[0]?.count || 0;

    // Si aún faltan fragmentos, responder con estado pendiente
    if (receivedCount < totalChunks) {
      return NextResponse.json({
        success: true,
        complete: false,
        receivedCount,
        totalChunks,
      });
    }

    // Todos los fragmentos han llegado: concatenar y ensamblar el archivo completo
    const rows: any = await prisma.$queryRaw`
      SELECT data FROM _upload_chunks WHERE upload_id = ${uploadId} ORDER BY chunk_index ASC
    `;

    const fullBuffer = Buffer.concat(rows.map((r: any) => r.data));

    // Eliminar los fragmentos temporales de la base de datos
    await prisma.$executeRaw`
      DELETE FROM _upload_chunks WHERE upload_id = ${uploadId}
    `;

    // Normalizar MIME type
    let cleanMime = (mimeType || "").toLowerCase().split(";")[0].trim();
    if (!cleanMime || cleanMime === "application/octet-stream") {
      cleanMime = fileName.endsWith(".mov") ? "video/quicktime" : "video/mp4";
    }

    // Guardar el archivo ensamblado en el almacenamiento activo (local o Data URL)
    const uploadResult = await saveStorageFile(fullBuffer, fileName, folder as any, cleanMime);

    await recordAuditLog({
      user: session,
      accion: "UPLOAD_FILE",
      entidad: "Storage",
      entidadAfectada: "Storage",
      detallesCambio: {
        fileName,
        fileSize: fullBuffer.length,
        fileType: cleanMime,
        folder,
        totalChunks,
        url: uploadResult.url.startsWith("data:") ? "[data:video;base64]" : uploadResult.url,
        descripcion: `Subida de video fragmentado '${fileName}' (${totalChunks} partes, ${(fullBuffer.length / (1024 * 1024)).toFixed(1)}MB)`,
      },
    });

    return NextResponse.json({
      success: true,
      complete: true,
      file: uploadResult,
    });
  } catch (error: any) {
    console.error("Error en procesamiento de fragmento de video:", error);
    return NextResponse.json(
      { error: "Error al procesar fragmento en el servidor: " + (error?.message || "desconocido") },
      { status: 500 }
    );
  }
}
