import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { StorageUploadResult } from "@/types";

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  path?: string;
}

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "vehicle-photos";

/**
 * Verifica el estado del proveedor de almacenamiento activo.
 */
export function getStorageStatus() {
  if (isSupabaseConfigured()) {
    return {
      provider: "supabase" as const,
      bucket: DEFAULT_BUCKET,
      isConfigured: true,
    };
  }

  if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
    return {
      provider: "s3" as const,
      bucket: process.env.AWS_S3_BUCKET,
      isConfigured: true,
    };
  }

  return {
    provider: "local" as const,
    bucket: "public/uploads",
    isConfigured: true, // Local filesystem siempre disponible para desarrollo
  };
}

/**
 * Sube una fotografía o video de un vehículo al Object Storage configurado
 * (Supabase Storage con fallback automático local para desarrollo).
 */
export async function uploadVehiclePhoto(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType?: string,
  subFolder: string = "vehiculos"
): Promise<StorageUploadResult> {
  const extension = path.extname(originalFilename).toLowerCase() || ".jpg";
  const uniqueId = crypto.randomUUID();
  const filename = `${uniqueId}${extension}`;
  const storagePath = `${subFolder}/${filename}`;
  const detectedMimeType =
    mimeType ||
    (extension === ".mp4" ? "video/mp4" : extension === ".png" ? "image/png" : "image/jpeg");

  // 1. Intentar subir a Supabase Storage si está configurado
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(DEFAULT_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: detectedMimeType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from(DEFAULT_BUCKET)
          .getPublicUrl(storagePath);

        return {
          url: publicUrlData.publicUrl,
          path: storagePath,
          filename,
          size: fileBuffer.length,
          mimeType: detectedMimeType,
          provider: "supabase",
        };
      } else {
        console.warn("Error en Supabase Storage, recurriendo a fallback local:", uploadError.message);
      }
    } catch (err: any) {
      console.warn("Excepción al conectar con Supabase Storage:", err?.message || err);
    }
  }

  // 2. Almacenamiento local (Disco local para desarrollo o fallback)
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", subFolder);
    await fs.mkdir(uploadDir, { recursive: true });

    const localFilePath = path.join(uploadDir, filename);
    await fs.writeFile(localFilePath, fileBuffer);

    const localUrl = `/uploads/${subFolder}/${filename}`;

    return {
      url: localUrl,
      path: storagePath,
      filename,
      size: fileBuffer.length,
      mimeType: detectedMimeType,
      provider: "local",
    };
  } catch (fsErr: any) {
    console.warn("Sistema de archivos de sólo lectura (entorno Serverless/Vercel):", fsErr?.message);

    // 3. Fallback infalible para Serverless / Vercel:
    // Retorna Data URL base64 comprimida, 100% compatible con visualización HTML y persistencia en DB
    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${detectedMimeType};base64,${base64Data}`;

    return {
      url: dataUrl,
      path: storagePath,
      filename,
      size: fileBuffer.length,
      mimeType: detectedMimeType,
      provider: "local",
    };
  }
}

/**
 * Obtiene la URL pública o firmada de una foto en Storage.
 */
export function getVehiclePhotoPublicUrl(filePath: string): string {
  if (filePath.startsWith("data:") || filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  if (isSupabaseConfigured() && supabaseAdmin && !filePath.startsWith("/")) {
    const { data } = supabaseAdmin.storage.from(DEFAULT_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }
  return filePath.startsWith("/") ? filePath : `/uploads/${filePath}`;
}

/**
 * Elimina una foto del Object Storage.
 */
export async function deleteVehiclePhoto(filePath: string): Promise<boolean> {
  if (filePath.startsWith("data:")) {
    return true;
  }
  if (isSupabaseConfigured() && supabaseAdmin && !filePath.startsWith("/")) {
    try {
      const { error } = await supabaseAdmin.storage.from(DEFAULT_BUCKET).remove([filePath]);
      return !error;
    } catch {
      return false;
    }
  }

  try {
    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    await fs.unlink(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Función compatible con código existente de subida en taller-saas
 */
export async function saveStorageFile(
  fileBuffer: Buffer,
  originalFilename: string,
  folder: "multimedia" | "remitos" = "multimedia",
  mimeType?: string
): Promise<UploadResult> {
  const result = await uploadVehiclePhoto(fileBuffer, originalFilename, mimeType, folder);
  return {
    url: result.url,
    filename: result.filename,
    size: result.size,
    mimeType: result.mimeType,
    path: result.path,
  };
}
