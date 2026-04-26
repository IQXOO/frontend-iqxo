"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, File, Image } from "lucide-react"

interface AttachmentCarouselProps {
  attachments: Array<{ id: string; url: string; type: "image" | "pdf"; name: string }>
  onClose?: () => void
}

export function AttachmentCarousel({ attachments, onClose }: AttachmentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!attachments.length) return null

  const current = attachments[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < attachments.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden border border-white/10">
          {current.type === "image" ? (
            <img 
              src={current.url} 
              alt={current.name}
              className="w-full h-auto object-cover"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center">
              <File className="w-16 h-16 text-blue-400" />
            </div>
          )}

          {/* Counter */}
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 rounded-full text-xs font-medium text-white">
            {currentIndex + 1} / {attachments.length}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all active:scale-95"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Navigation */}
          {hasPrev && (
            <button
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={() => setCurrentIndex(next => next + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Attachment name */}
        <p className="mt-4 text-center text-sm text-muted-foreground truncate">{current.name}</p>
      </div>
    </div>
  )
}
