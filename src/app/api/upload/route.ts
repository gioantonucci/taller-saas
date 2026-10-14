import { NextRequest, NextResponse } from "next/server";
import { saveStorageFile } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "multimedia";

    if (folder !== "multimedia" && folder !== "remitos") {
      return NextResponse.json({ error: "Carpeta inválida" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo permitido de 15MB" },
        { status: 400 }
      );
    }

    const ALLOWED_MIME_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/pdf",
    ];

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await saveStorageFile(buffer, file.name, folder);

    await recordAuditLog({
      user: session,
      accion: "UPLOAD_FILE",
      entidad: "Storage",
      entidadAfectada: "Storage",
      detallesCambio: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        folder,
        url: uploadResult.url,
        descripcion: `Subida de archivo '${file.name}' a almacenamiento (${folder})`,
      },
    });

    return NextResponse.json({
      success: true,
      file: uploadResult,
    });
  } catch (error: any) {
    console.error("Error al procesar subida a Object Storage:", error);
    return NextResponse.json(
      { error: "Error al guardar el archivo en el almacenamiento" },
      { status: 500 }
    );
  }
}
