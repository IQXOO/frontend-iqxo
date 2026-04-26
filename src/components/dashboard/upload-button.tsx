"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Upload, X, FileText, Image, Loader2, AlertCircle, CheckCircle, Globe, ChevronDown, ImageIcon, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { VOICE_LANGUAGES, type VoiceLang } from "../../hooks/use-voice-input"
import { analyzeEventFromImage } from "../../lib/openai-voice"
import { useApp } from "../../lib/store"
import type { ParsedEvent } from "../../lib/parse-voice-input"

interface UploadButtonProps {
  externalOpen: boolean
  onExternalOpenChange: (open: boolean) => void
  onExtractedData?: (data: ParsedEvent) => void
}

type UploadState = "picking" | "preview" | "analyzing" | "error"

interface FilePreview {
  name: string
  type: string
  size: string
  dataUrl: string
  base64: string
  mediaType: string
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]
const MAX_SIZE = 10 * 1024 * 1024

const STORAGE_UPLOAD_LANG = "iqxo_upload_lang"

export function UploadButton({
  externalOpen,
  onExternalOpenChange,
  onExtractedData,
}: UploadButtonProps) {
  const { t, language } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>("picking")
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const hasAutoTriggered = useRef(false)
  
  // Language selection state
  const [selectedLang, setSelectedLang] = useState<VoiceLang>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_UPLOAD_LANG)
      if (saved) {
        const found = VOICE_LANGUAGES.find((l) => l.code === saved)
        if (found) return found
      }
    }
    return language === "fr"
      ? VOICE_LANGUAGES.find((l) => l.code === "fr-FR")!
      : language === "ar"
        ? VOICE_LANGUAGES.find((l) => l.code === "ar-SA")!
        : VOICE_LANGUAGES.find((l) => l.code === "en-US")!
  })
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const langPickerRef = useRef<HTMLDivElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleClose = useCallback(() => {
    setState("picking")
    setPreview(null)
    setErrorMessage("")
    setLangPickerOpen(false)
    hasAutoTriggered.current = false // Reset the trigger flag
    onExternalOpenChange(false)
  }, [onExternalOpenChange])

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_UPLOAD_LANG, selectedLang.code)
  }, [selectedLang])

  // Close language picker when clicking outside
  useEffect(() => {
    if (!langPickerOpen) return
    const handle = (e: MouseEvent) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
        setLangPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [langPickerOpen])

  // Auto-trigger file picker when externally opened
  useEffect(() => {
    if (externalOpen && state === "picking" && !preview && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true // Mark as triggered
      // Slight delay to let the modal render first
      const timer = setTimeout(() => {
        fileInputRef.current?.click()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [externalOpen, state, preview])

  // Reset auto-trigger flag when modal is closed
  useEffect(() => {
    if (!externalOpen) {
      hasAutoTriggered.current = false
    }
  }, [externalOpen])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) {
        // User cancelled the file picker
        if (!preview) handleClose()
        return
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setErrorMessage(t("uploadUnsupported"))
        setState("error")
        return
      }

      if (file.size > MAX_SIZE) {
        setErrorMessage(t("uploadTooLarge"))
        setState("error")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(",")[1]
        setPreview({
          name: file.name,
          type: file.type,
          size: formatSize(file.size),
          dataUrl,
          base64,
          mediaType: file.type,
        })
        setState("preview")
      }
      reader.onerror = () => {
        setErrorMessage("Failed to read file")
        setState("error")
      }
      reader.readAsDataURL(file)
      // Reset input value to allow selecting the same file again
      e.target.value = ""
    },
    [t, handleClose] // Remove preview from dependencies
  )

//   const handleAnalyze = useCallback(async () => {
//     if (!preview) return
//     setState("analyzing")
//     setErrorMessage("")

//     try {
      
//       console.log("[v0] Analyzing image with AI vision...")
      
//       // Use real AI vision analysis
//       // const extractedEvent = await analyzeEventFromImage(preview.base64, preview.type)
//       const response = await fetch("http://localhost:3001/analyze-image", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//   },
//   body: JSON.stringify({
//     imageBase64: preview.base64,
//     mimeType: preview.type,
//   }),
// })

// const extractedEvent = await response.json()
//       console.log("[v0] Extracted event from image:", extractedEvent)

//       onExtractedData?.(extractedEvent)
//       handleClose()
//     } catch (err) {
//       const msg = err instanceof Error ? err.message : t("uploadError")
//       console.error("[v0] Image analysis error:", err)
//       setErrorMessage(msg)
//       setState("error")
//     }
//   }, [preview, t, handleClose, onExtractedData])
const handleAnalyze = useCallback(async () => {
  if (!preview) return

  setState("analyzing")
  setErrorMessage("")

  try {
    console.log("[v0] Starting image analysis:", {
      name: preview.name,
      type: preview.type,
      size: preview.size
    })

    // Convert base64 to blob for FormData
    const response = await fetch(preview.dataUrl)
    if (!response.ok) {
      throw new Error("Failed to convert image to blob")
    }
    const blob = await response.blob()

    console.log("[v0] Created blob:", {
      size: blob.size,
      type: blob.type
    })

    const formData = new FormData()
    formData.append("image", blob, preview.name) 

    console.log("[v0] Sending to server: http://192.168.1.3:4000/analyze-image")

    const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/analyze-image`, {
      method: "POST",
      body: formData,
    })

    console.log("[v0] Server response:", {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[v0] Server error response:", text)
      throw new Error(text || `Server error: ${res.status}`)
    }

    const extractedEvent = await res.json()
    console.log("[v0] Extracted event:", extractedEvent)

    // Validate the response structure
    if (!extractedEvent || typeof extractedEvent !== 'object') {
      throw new Error("Invalid response from server")
    }

    // Send extracted data + the photo dataUrl so it prefills in event form
    onExtractedData?.(extractedEvent, preview?.dataUrl ?? undefined)

    handleClose()
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed"
    console.error("[v0] Image analysis error:", err)
    setErrorMessage(msg)
    setState("error")
  }
}, [preview, onExtractedData, handleClose])
  const isImage = preview?.type.startsWith("image/")

  return (
    <>
      <input
        ref={fileInputRef}
        id="iqxo-upload-input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        aria-label={t("uploadLabel")}
      />

      {/* Only render modal when externalOpen is true */}
      {externalOpen && (
        <>
      {/* Full overlay modal - pb-32 ensures content is above bottom nav bar */}
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md glass rounded-t-3xl p-5 animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: "120px" }}>
          {/* Preview state */}
          {state === "preview" && preview && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("uploadPreview")}
                  </h3>
                  {/* Language picker */}
                  <div ref={langPickerRef} className="relative">
                    <button
                      onClick={() => setLangPickerOpen(!langPickerOpen)}
                      className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      title="Select language for analysis"
                    >
                      <span>{selectedLang.flag} {selectedLang.label}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    
                    {langPickerOpen && (
                      <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto w-40">
                        {VOICE_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setSelectedLang(lang)
                              setLangPickerOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${
                              selectedLang.code === lang.code ? "bg-primary/10 font-medium" : ""
                            }`}
                          >
                            <span>{lang.flag} {lang.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-secondary/50 overflow-hidden flex items-center justify-center h-40">
                {isImage ? (
                  <img
                    src={preview.dataUrl}
                    alt={preview.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <FileText className="h-12 w-12 text-primary/60" />
                    <span className="text-xs font-mono text-muted-foreground">PDF</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isImage ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {preview.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{preview.size}</p>
                </div>
              </div>

              {/* Big analyze button */}
              <button
                onClick={handleAnalyze}
                className="w-full rounded-2xl py-4 text-base font-bold text-primary-foreground flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg bg-primary"
              >
                <Sparkles className="h-5 w-5" />
                {t("uploadAnalyze")}
              </button>
            </div>
          )}

          {/* Picking state (waiting for file input) */}
          {state === "picking" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              <p className="text-xs text-muted-foreground">{t("uploadLabel")}...</p>
              <button onClick={handleClose} className="text-xs text-primary font-medium">
                {t("cancel")}
              </button>
            </div>
          )}

          {/* Analyzing */}
          {state === "analyzing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                </div>
                <Loader2 className="absolute -inset-2 h-20 w-20 text-primary/30 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {t("uploadAnalyzing")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("uploadAnalyzingDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {t("uploadFailed")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  {errorMessage}
                </p>
              </div>
              <button onClick={handleClose} className="text-xs text-primary font-medium">
                {t("cancel")}
              </button>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </>
  )
}
