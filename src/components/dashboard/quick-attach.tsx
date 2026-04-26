"use client"

import { Camera, FileText, Plus, X } from "lucide-react"
import { useState } from "react"
import { useApp } from "../../lib/store"

interface AttachedMedia {
  id: string
  type: "photo" | "doc"
  name: string
  url?: string
}

interface QuickAttachProps {
  eventId: string
  onAttach?: (media: AttachedMedia) => void
  compact?: boolean
}

export function QuickAttach({ eventId, onAttach, compact = false }: QuickAttachProps) {
  const { language, t } = useApp()
  const [attachments, setAttachments] = useState<AttachedMedia[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAttachPhoto = () => {
    const newMedia: AttachedMedia = {
      id: Math.random().toString(),
      type: "photo",
      name: "Photo_" + new Date().toLocaleDateString(),
    }
    setAttachments([...attachments, newMedia])
    onAttach?.(newMedia)
  }

  const handleAttachDoc = () => {
    const newMedia: AttachedMedia = {
      id: Math.random().toString(),
      type: "doc",
      name: "Document_" + new Date().toLocaleDateString(),
    }
    setAttachments([...attachments, newMedia])
    onAttach?.(newMedia)
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }

  if (compact && attachments.length === 0) {
    return null
  }

  return (
    <div className={`${language === "ar" ? "text-right" : "text-left"} px-5 py-2`}>
      <div className="glass rounded-2xl p-3 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 relative">
            {attachments.map((media, idx) => (
              <div
                key={media.id}
                className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center relative"
                style={{ zIndex: 10 - idx }}
              >
                {media.type === "photo" ? (
                  <Camera className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            ))}
          </div>
          {attachments.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground ml-1">
              {attachments.length} {t("attached")}
            </span>
          )}
        </div>

        <div className={`flex gap-2 ${isExpanded ? "flex-col" : "flex-row"}`}>
          <button
            onClick={handleAttachPhoto}
            className={`flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-colors ${
              isExpanded
                ? "w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground"
                : "p-2 bg-primary/15 hover:bg-primary/25 text-primary"
            }`}
          >
            <Camera className="h-4 w-4" />
            {isExpanded && t("attachPhoto")}
          </button>
          <button
            onClick={handleAttachDoc}
            className={`flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-colors ${
              isExpanded
                ? "w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground"
                : "p-2 bg-primary/15 hover:bg-primary/25 text-primary"
            }`}
          >
            <FileText className="h-4 w-4" />
            {isExpanded && t("attachDoc")}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-lg transition-colors"
          >
            {isExpanded ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="mt-2 space-y-1.5 pt-2 border-t border-primary/10">
            {attachments.map((media) => (
              <div key={media.id} className="flex items-center justify-between gap-2 p-2 rounded bg-secondary/30">
                <div className="flex items-center gap-2 min-w-0">
                  {media.type === "photo" ? (
                    <Camera className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <span className="text-xs text-foreground truncate">{media.name}</span>
                </div>
                <button
                  onClick={() => removeAttachment(media.id)}
                  className="p-1 hover:bg-secondary rounded transition-colors flex-shrink-0"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
