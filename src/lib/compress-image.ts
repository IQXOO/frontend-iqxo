/**
 * Compress image client-side before upload
 * Uses Canvas API - no external dependencies
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 1,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"))
              return
            }

            // Check if compression is needed
            if (blob.size > maxSizeMB * 1024 * 1024) {
              // If still too large, recursively compress with lower quality
              if (quality > 0.5) {
                compressImage(
                  new File([blob], file.name, { type: file.type }),
                  maxSizeMB,
                  maxWidth,
                  maxHeight,
                  quality - 0.1
                )
                  .then(resolve)
                  .catch(reject)
              } else {
                resolve(blob)
              }
            } else {
              resolve(blob)
            }
          },
          file.type || "image/jpeg",
          quality
        )
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}
