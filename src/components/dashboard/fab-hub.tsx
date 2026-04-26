"use client"

import { useState, useRef, useCallback } from "react"
import { Plus, Upload, PenLine, Sparkles } from "lucide-react"
import { useApp } from "@/lib/store"

interface FabHubProps {
  onUploadClick: () => void
  onManualAdd: () => void
}

export function FabHub({ onUploadClick, onManualAdd }: FabHubProps) {
  const { t } = useApp()
  const [expanded, setExpanded] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        setExpanded(false)
      }
    },
    []
  )

  const handleUpload = useCallback(() => {
    setExpanded(false)
    onUploadClick()
  }, [onUploadClick])

  const handleManual = useCallback(() => {
    setExpanded(false)
    onManualAdd()
  }, [onManualAdd])

  return (
    <>
      {/* Scrim overlay */}
      {expanded && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-[96px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        {/* Fan-out actions */}
        <div
          className={`flex items-end gap-5 mb-3 transition-all duration-300 ease-out ${
            expanded
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-6 pointer-events-none"
          }`}
        >
          {/* Manual add (left) */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleManual}
              className="h-12 w-12 rounded-full bg-secondary text-foreground shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-secondary/80 active:scale-90 hover:shadow-xl"
              aria-label={t("fabManual")}
              tabIndex={expanded ? 0 : -1}
            >
              <PenLine className="h-[18px] w-[18px]" />
            </button>
            <span className="text-[10px] font-medium text-muted-foreground">
              {t("fabManual")}
            </span>
          </div>

          {/* Upload / AI Scan (right, hero) */}
          <div className="flex flex-col items-center gap-1.5 -translate-y-2">
            <button
              onClick={handleUpload}
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-all duration-200 hover:bg-primary/90 active:scale-90 hover:shadow-2xl ring-2 ring-primary/20"
              aria-label={t("fabUpload")}
              tabIndex={expanded ? 0 : -1}
            >
              <div className="relative">
                <Upload className="h-5 w-5" />
                <Sparkles className="absolute -top-1.5 -right-1.5 h-3 w-3 text-primary-foreground/70" />
              </div>
            </button>
            <span className="text-[10px] font-semibold text-primary">
              {t("fabUpload")}
            </span>
          </div>
        </div>

        {/* Main + / X toggle */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-90 hover:shadow-2xl ${
            expanded
              ? "bg-secondary text-foreground"
              : "bg-primary text-primary-foreground"
          }`}
          aria-label={expanded ? t("cancel") : t("addEvent")}
          aria-expanded={expanded}
        >
          <div
            className={`transition-transform duration-300 ${expanded ? "rotate-[135deg]" : "rotate-0"}`}
          >
            <Plus className="h-6 w-6" />
          </div>
        </button>
      </div>
    </>
  )
}
