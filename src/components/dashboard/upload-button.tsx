"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { X, FileText, Loader2, AlertCircle, ChevronDown, ImageIcon, Sparkles } from "lucide-react"
import { VOICE_LANGUAGES, type VoiceLang } from "../../hooks/use-voice-input"
import { useApp } from "../../lib/store"
import type { ParsedEvent } from "../../lib/parse-voice-input"
import { devError, devLog, fetchWithDiagnostics, getFriendlyErrorMessage, readResponseText, withAsyncDiagnostics } from "../../lib/logger"
import { useToast } from "../../hooks/use-toast"

interface UploadButtonProps {
  externalOpen: boolean
  onExternalOpenChange: (open: boolean) => void
  onExtractedData?: (data: ParsedEvent, imageUrl?: string) => void
  autoOpenPicker?: boolean
  incomingFile?: File | null
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
  autoOpenPicker = true,
  incomingFile = null,
}: UploadButtonProps) {
  const { t, language, user, session, setTotalUsage } = useApp()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>("picking")
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const hasAutoTriggered = useRef(false)
  const lastIncomingFileRef = useRef<File | null>(null)
  
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
    if (!autoOpenPicker) return
    if (externalOpen && state === "picking" && !preview && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true // Mark as triggered
      devLog('Upload', 'File picker auto-opened')
      const frame = requestAnimationFrame(() => {
        fileInputRef.current?.click()
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [autoOpenPicker, externalOpen, state, preview])

  // Reset auto-trigger flag when modal is closed
  useEffect(() => {
    if (!externalOpen) {
      hasAutoTriggered.current = false
    }
  }, [externalOpen])

  const processFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage(t("uploadUnsupported"))
      toast({
        title: "Unsupported file type",
        description: t("uploadUnsupported"),
        variant: "destructive",
      })
      setState("error")
      return
    }

    if (file.size > MAX_SIZE) {
      setErrorMessage(t("uploadTooLarge"))
      toast({
        title: "File is too large",
        description: t("uploadTooLarge"),
        variant: "destructive",
      })
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
      devError('Upload', 'Failed to read selected file')
      const message = "Couldn't read the selected file. Please choose another one."
      setErrorMessage(message)
      toast({
        title: "Couldn't read file",
        description: message,
        variant: "destructive",
      })
      setState("error")
    }
    reader.readAsDataURL(file)
  }, [toast, t])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) {
        // User cancelled the file picker
        if (!preview) handleClose()
        devLog('Upload', 'File picker cancelled')
        return
      }

      devLog('Upload', 'File selected', { name: file.name, type: file.type, size: file.size })

      void processFile(file)
      // Reset input value to allow selecting the same file again
      e.target.value = ""
    },
    [handleClose, preview, processFile]
  )

  useEffect(() => {
    if (!incomingFile) return
    if (!externalOpen) return
    if (incomingFile === lastIncomingFileRef.current) return
    lastIncomingFileRef.current = incomingFile
    devLog('Upload', 'Processing externally supplied file', { name: incomingFile.name, type: incomingFile.type, size: incomingFile.size })
    void processFile(incomingFile)
  }, [incomingFile, externalOpen, processFile])

  const handleAnalyze = useCallback(async () => {
    if (!preview) return

    setState("analyzing")
    setErrorMessage("")

    try {
      await withAsyncDiagnostics(
        'Upload',
        'Analyze image',
        async () => {
          devLog('Upload', 'Starting image analysis', {
            name: preview.name,
            type: preview.type,
            size: preview.size,
          })

          const base64 = preview.base64
          const contentType = preview.mediaType || preview.type || "application/octet-stream"
          const byteString = atob(base64)
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }
          const blob = new Blob([ab], { type: contentType })

          devLog('Upload', 'Image blob created', { size: blob.size, type: blob.type })

          const formData = new FormData()
          formData.append("image", blob, preview.name)
          if (user?.id) formData.append("userId", user.id)

          const headers: Record<string, string> = {}
          if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

          const res = await fetchWithDiagnostics(
            'Upload',
            'POST /analyze-image',
            `${import.meta.env.VITE_BACKEND_API}/analyze-image`,
            {
              method: "POST",
              headers,
              body: formData,
            },
            { timeoutMs: 60000, context: { name: preview.name, type: preview.type } },
          )

          if (!res.ok) {
            const text = await readResponseText(res)
            devError('Upload', 'Image analysis failed', text, { status: res.status, statusText: res.statusText })
            throw new Error(text || `Server error: ${res.status}`)
          }

          const raw = await res.json()
          devLog('Upload', 'Image analysis response received', { hasEvent: Boolean(raw?.event), hasActualCost: Boolean(raw?.actualCost) })

          const extractedEvent = raw && typeof raw === "object" ? (raw.event ?? raw) : null
          if (!extractedEvent || typeof extractedEvent !== "object") {
            throw new Error("Invalid response from server")
          }

          if (typeof raw.total_usage === "number") {
            devLog('Upload', 'analyze-image total_usage received', { total_usage: raw.total_usage })
            setTotalUsage(raw.total_usage)
          }

          onExtractedData?.(extractedEvent, preview?.dataUrl ?? undefined)
          handleClose()
        },
        {
          method: 'POST',
          context: { name: preview.name, type: preview.type },
          timeoutMs: 60000,
          onError: (message) => {
            const friendly = getFriendlyErrorMessage(message, t("uploadError"))
            setErrorMessage(friendly)
            toast({
              title: "Couldn't analyze image",
              description: friendly,
              variant: "destructive",
            })
          },
        },
      )
    } catch (err) {
      const msg = getFriendlyErrorMessage(err, "Analysis failed")
      devError('Upload', 'Image analysis failed', err)
      setErrorMessage(msg)
      toast({
        title: "Couldn't analyze image",
        description: msg,
        variant: "destructive",
      })
      setState("error")
    }
  }, [preview, onExtractedData, handleClose, session?.access_token, user?.id, toast, t])
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
