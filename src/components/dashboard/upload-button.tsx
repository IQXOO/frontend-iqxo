"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { X, FileText, Loader2, AlertCircle, ChevronDown, ImageIcon, Sparkles } from "lucide-react"
import { VOICE_LANGUAGES, type VoiceLang } from "../../hooks/use-voice-input"
import { useApp } from "../../lib/store"
import type { ParsedEvent } from "../../lib/parse-voice-input"
import { devError, devLog, fetchWithDiagnostics, getFriendlyErrorMessage, readResponseText, withAsyncDiagnostics } from "../../lib/logger"
import { useToast } from "../../hooks/use-toast"
import { supabase } from "../../lib/supabase"

async function uploadToStorage(file: File, userId: string, bucket: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

interface UploadButtonProps {
  externalOpen: boolean
  onExternalOpenChange: (open: boolean) => void
  onExtractedData?: (data: ParsedEvent | ParsedEvent[], imageUrl?: string | string[]) => void
  autoOpenPicker?: boolean
  incomingFiles?: File[]
}

type UploadState = "picking" | "preview" | "analyzing" | "error"

interface FilePreview {
  name: string
  type: string
  size: string
  dataUrl: string
  base64: string
  mediaType: string
  file: File
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
  incomingFiles = [],
}: UploadButtonProps) {
  const { t, language, user, session, setTotalUsage } = useApp()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>("picking")
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const hasAutoTriggered = useRef(false)
  const lastIncomingFilesRef = useRef<File[]>([])
  
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
    setPreviews([])
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
    if (externalOpen && state === "picking" && previews.length === 0 && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true // Mark as triggered
      devLog('Upload', 'File picker auto-opened')
      const frame = requestAnimationFrame(() => {
        fileInputRef.current?.click()
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [autoOpenPicker, externalOpen, state, previews])

  // Reset auto-trigger flag when modal is closed
  useEffect(() => {
    if (!externalOpen) {
      hasAutoTriggered.current = false
    }
  }, [externalOpen])

  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(f => (f.type.startsWith("image/") || f.type === "application/pdf") && f.size <= MAX_SIZE)
    
    if (validFiles.length !== files.length) {
       toast({
        title: "Some files skipped",
        description: "Some files were skipped due to unsupported type or size > 10MB.",
        variant: "destructive",
      })
    }

    if (validFiles.length === 0) {
      setErrorMessage("No valid files selected.")
      setState("error")
      return
    }

    // Use FileReader for reliable image rendering on mobile/iOS
    const newPreviews = await Promise.all(
      validFiles.map(
        (file) =>
          new Promise<FilePreview>((resolve) => {
            if (file.type.startsWith("image/")) {
              const reader = new FileReader()
              reader.onload = (e) => {
                resolve({
                  name: file.name,
                  type: file.type,
                  size: formatSize(file.size),
                  dataUrl: e.target?.result as string,
                  base64: "", // Not used anymore
                  mediaType: file.type,
                  file: file,
                })
              }
              reader.onerror = () => {
                resolve({
                  name: file.name,
                  type: file.type,
                  size: formatSize(file.size),
                  dataUrl: "",
                  base64: "",
                  mediaType: file.type,
                  file: file,
                })
              }
              reader.readAsDataURL(file)
            } else {
              resolve({
                name: file.name,
                type: file.type,
                size: formatSize(file.size),
                dataUrl: "",
                base64: "",
                mediaType: file.type,
                file: file,
              })
            }
          })
      )
    )

    if (newPreviews.length > 0) {
      setPreviews(newPreviews)
      setState("preview")
    }
  }, [toast])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      e.target.value = '' // Reset input so re-selecting the same file works
      if (files.length === 0) {
        if (previews.length === 0) handleClose()
        devLog('Upload', 'File picker cancelled')
        return
      }
      devLog('Upload', 'Files selected', { count: files.length })
      void processFiles(files)
    },
    [handleClose, previews, processFiles]
  )

  useEffect(() => {
    if (!incomingFiles || incomingFiles.length === 0) return
    if (!externalOpen) return
    
    // Check if the array of files is exactly the same reference
    if (incomingFiles === lastIncomingFilesRef.current) return
    lastIncomingFilesRef.current = incomingFiles
    
    devLog('Upload', 'Processing externally supplied files', { count: incomingFiles.length })
    void processFiles(incomingFiles)
  }, [incomingFiles, externalOpen, processFiles])

  const handleAnalyze = useCallback(async () => {
    if (previews.length === 0) return

    setState("analyzing")
    setErrorMessage("")

    try {
      await withAsyncDiagnostics(
        'Upload',
        'Analyze images',
        async () => {
          devLog('Upload', 'Starting batched image analysis', { count: previews.length })

          const formData = new FormData()
          if (user?.id) formData.append("userId", user.id)

          for (const preview of previews) {
            formData.append("images", preview.file, preview.name)
          }

          const headers: Record<string, string> = {}
          if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

          const res = await fetchWithDiagnostics(
            'Upload',
            'POST /analyze-images',
            `${import.meta.env.VITE_BACKEND_API}/analyze-images`,
            { method: "POST", headers, body: formData },
            { timeoutMs: 120000, context: { count: previews.length } },
          )

          if (!res.ok) {
            const text = await readResponseText(res)
            throw new Error(text || `Server error: ${res.status} when analyzing images`)
          }

          const raw = await res.json()
          const events = raw.events || []
          
          let allExtractedEvents: ParsedEvent[] = []
          if (Array.isArray(events)) {
            allExtractedEvents = events
          } else if (raw.event) {
            allExtractedEvents = [raw.event]
          }

          if (typeof raw.total_usage === "number" && raw.total_usage > 0) {
            setTotalUsage(raw.total_usage)
          }

          if (allExtractedEvents.length === 0) {
            throw new Error("No events found in the selected images.")
          }

          // Upload files to Supabase Storage to get permanent URLs
          const uploadedUrls = await Promise.all(
            previews.map(async (p) => {
              try {
                if (p.file.type.startsWith("image/")) {
                  return await uploadToStorage(p.file, user?.id || "anon", "event-images");
                } else if (p.file.type === "application/pdf") {
                  return await uploadToStorage(p.file, user?.id || "anon", "event-pdfs");
                }
              } catch (err) {
                console.warn("Failed to upload preview to storage, falling back to dataUrl", err);
              }
              return p.dataUrl; // Fallback to base64 if upload fails
            })
          );

          onExtractedData?.(allExtractedEvents, uploadedUrls)
          handleClose()
        },
        {
          method: 'POST',
          context: { count: previews.length },
          timeoutMs: 120000,
          onError: (message) => {
            const friendly = getFriendlyErrorMessage(message, t("uploadError"))
            setErrorMessage(friendly)
            toast({
              title: "Couldn't analyze images",
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
        title: "Couldn't analyze images",
        description: msg,
        variant: "destructive",
      })
      setState("error")
    }
  }, [previews, onExtractedData, handleClose, session?.access_token, user?.id, toast, t, setTotalUsage])
  const handleRemovePreview = useCallback((idxToRemove: number) => {
    setPreviews(prev => {
      const newPreviews = prev.filter((_, idx) => idx !== idxToRemove);
      if (newPreviews.length === 0) {
        handleClose();
      }
      return newPreviews;
    });
  }, [handleClose]);

  const primaryPreview = previews[0]

  return (
    <>
      <input
        ref={fileInputRef}
        id="iqxo-upload-input"
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        aria-label={t("uploadLabel")}
      />

      {/* Only render modal when externalOpen is true */}
      {externalOpen && (
        <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md glass rounded-t-3xl p-5 animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: "120px" }}>
          
          {/* Preview state */}
          {state === "preview" && previews.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {previews.length > 1 ? `${previews.length} Files Selected` : t("uploadPreview")}
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-secondary/50 overflow-hidden flex items-center h-40 w-full overflow-x-auto snap-x hide-scrollbar">
                <div className="flex gap-2 p-2 min-w-max h-full">
                  {previews.map((preview, idx) => (
                    preview.type.startsWith("image/") ? (
                      <div key={idx} className="h-full aspect-square bg-background/50 rounded-xl overflow-hidden shrink-0 snap-center relative shadow-sm group">
                        <button onClick={() => handleRemovePreview(idx)} className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 transition-opacity hover:bg-black/80 active:scale-95">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <img
                          src={preview.dataUrl}
                          alt={preview.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div key={idx} className="flex flex-col items-center justify-center h-full aspect-square bg-background/50 rounded-xl shrink-0 snap-center relative shadow-sm group">
                        <button onClick={() => handleRemovePreview(idx)} className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 transition-opacity hover:bg-black/80 active:scale-95">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <FileText className="h-10 w-10 text-primary/60" />
                        <span className="text-[10px] font-mono text-muted-foreground mt-2">PDF</span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {previews.length === 1 && (
                <div className="flex items-center gap-3 mt-1">
                  {primaryPreview.type.startsWith("image/") ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {primaryPreview.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{primaryPreview.size}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                className="w-full rounded-2xl py-4 text-base font-bold text-primary-foreground flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg bg-primary mt-2"
              >
                <Sparkles className="h-5 w-5" />
                {t("uploadAnalyze")} {previews.length > 1 ? `(${previews.length})` : ""}
              </button>
            </div>
          )}

          {/* Picking state */}
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
