"use client"

import { useState } from "react"
import { X, ZoomIn, ZoomOut } from "lucide-react"

interface ImageLightboxProps {
  imageUrl: string
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function ImageLightbox({
  imageUrl,
  isOpen,
  onClose,
  title,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex flex-col items-center gap-3 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <p className="text-sm font-medium text-foreground text-center">{title}</p>
        )}

        <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-secondary">
          <img
            src={imageUrl}
            alt={title || "Preview"}
            className="max-w-full max-h-[70vh] object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            disabled={zoom <= 1}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
