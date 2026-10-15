/**
 * Comprime y escala imágenes en el navegador antes de enviarlas al servidor/Object Storage.
 * Cumple con el requisito estricto de compresión Mobile-First para ahorrar ancho de banda.
 */
export async function compressImageClient(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8
): Promise<{ blob: Blob; file: File; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    // Si no es imagen (ej. video o PDF), devolver tal cual
    if (!file.type.startsWith("image/")) {
      return resolve({
        blob: file,
        file,
        originalSize: file.size,
        compressedSize: file.size,
      });
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve({
            blob: file,
            file,
            originalSize: file.size,
            compressedSize: file.size,
          });
        }

        // Pintar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({
                blob: file,
                file,
                originalSize: file.size,
                compressedSize: file.size,
              });
            }

            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve({
              blob,
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        resolve({
          blob: file,
          file,
          originalSize: file.size,
          compressedSize: file.size,
        });
      };
    };

    reader.onerror = () => {
      resolve({
        blob: file,
        file,
        originalSize: file.size,
        compressedSize: file.size,
      });
    };
  });
}
