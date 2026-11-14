"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  ChevronDown,
  X,
  Loader2,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useVoiceInput,
  VOICE_LANGUAGES,
  type VoiceLang,
  type ParsedEvent,
} from "../../hooks/use-voice-input";
import { useApp } from "../../lib/store";

const STORAGE_VOICE_LANG = "iqxo_voice_lang";

function toFlagEmoji(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

interface VoiceButtonProps {
  onTranscript: (data: string | ParsedEvent) => void;
  externalOpen?: boolean;
  onClose?: () => void;
}

export function VoiceButton({
  onTranscript,
  externalOpen = false,
  onClose,
}: VoiceButtonProps) {
  const { language } = useApp();
  const isRTL = language === "ar";

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    cancelListening,
    changeLanguage,
    resetVoiceState,
    isSupported,
    error,
    isProcessing,
    eventData,
  } = useVoiceInput();

  // Smart initial language based on app language & localStorage
  const getInitialLang = useCallback((): VoiceLang => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_VOICE_LANG);
      if (saved) {
        const found = VOICE_LANGUAGES.find((l) => l.code === saved);
        if (found) return found;
      }
    }
    if (language === "ar") {
      return (
        VOICE_LANGUAGES.find((l) => l.code === "ar-EG") || VOICE_LANGUAGES[1]
      );
    }
    if (language === "fr") {
      return (
        VOICE_LANGUAGES.find((l) => l.code === "fr-FR") || VOICE_LANGUAGES[3]
      );
    }
    return VOICE_LANGUAGES[0]; // en-US default
  }, [language]);

  const [selectedLang, setSelectedLang] = useState<VoiceLang>(getInitialLang);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onCloseRef = useRef(onClose);
  const callbackFiredRef = useRef(false);

  onTranscriptRef.current = onTranscript;
  onCloseRef.current = onClose;

  // Sync if app language changes and no manual override saved
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_VOICE_LANG);
    if (!saved) {
      const initial = getInitialLang();
      setSelectedLang(initial);
      changeLanguage(initial.code);
    }
  }, [language, getInitialLang, changeLanguage]);

  // Cleanup on unmount to guarantee zero dangling mic streams
  useEffect(() => {
    return () => {
      cancelListening();
    };
  }, [cancelListening]);

  // Reset states whenever modal opens or closes
  useEffect(() => {
    if (externalOpen) {
      callbackFiredRef.current = false;
      setShowDone(false);
    } else {
      cancelListening();
    }
  }, [externalOpen, cancelListening]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [pickerOpen]);

  // Fire callback when transcription/event is ready
  useEffect(() => {
    if (isListening || isProcessing) return;

    const data = eventData ?? (transcript.trim() || null);
    if (!data || callbackFiredRef.current) return;

    callbackFiredRef.current = true;

    const timer = setTimeout(() => {
      onTranscriptRef.current(data);
      setShowDone(true);
      const closeTimer = setTimeout(() => {
        setShowDone(false);
        onCloseRef.current?.();
      }, 300);
      return () => clearTimeout(closeTimer);
    }, 50);

    return () => clearTimeout(timer);
  }, [isListening, isProcessing, transcript, eventData]);

  // Seamless language selection
  const handleSelectLang = useCallback(
    (lang: VoiceLang) => {
      setSelectedLang(lang);
      setPickerOpen(false);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_VOICE_LANG, lang.code);
      }
      changeLanguage(lang.code);
    },
    [changeLanguage],
  );

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      callbackFiredRef.current = false;
      setShowDone(false);
      resetVoiceState();
      startListening(selectedLang.code);
    }
  }, [
    isListening,
    startListening,
    stopListening,
    resetVoiceState,
    selectedLang.code,
  ]);

  const handleRetry = useCallback(() => {
    callbackFiredRef.current = false;
    setShowDone(false);
    resetVoiceState();
    setTimeout(() => {
      startListening(selectedLang.code);
    }, 350);
  }, [resetVoiceState, startListening, selectedLang.code]);

  const handleClose = useCallback(() => {
    cancelListening();
    onClose?.();
  }, [cancelListening, onClose]);

  if (!isSupported) return null;

  const L = {
    speakNow:
      language === "ar"
        ? "تحدث الآن"
        : language === "fr"
          ? "Parlez maintenant"
          : "Speak Now",
    listening:
      language === "ar"
        ? "أستمع..."
        : language === "fr"
          ? "J'écoute..."
          : "Listening...",
    processing:
      language === "ar"
        ? "جاري المعالجة الذكية..."
        : language === "fr"
          ? "Traitement IA..."
          : "Analyzing with AI...",
    done: language === "ar" ? "تم بنجاح!" : language === "fr" ? "Fait!" : "Done!",
    tapToSpeak:
      language === "ar"
        ? "اضغط للتحدث"
        : language === "fr"
          ? "Appuyez pour parler"
          : "Tap to speak",
    tapToStop:
      language === "ar"
        ? "اضغط لإنهاء التسجيل"
        : language === "fr"
          ? "Appuyez pour terminer"
          : "Tap to stop",
    retry:
      language === "ar"
        ? "إعادة التسجيل"
        : language === "fr"
          ? "Réessayer"
          : "Record again",
  };

  return (
    <AnimatePresence>
      {externalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center pb-16 pt-6 px-6"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            {/* Close */}
            <button
              onClick={handleClose}
              aria-label="Close voice modal"
              className="absolute top-4 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h2 className="text-white text-lg font-semibold mb-2">
              {L.speakNow}
            </h2>

            {/* Status line */}
            <div className="h-9 flex items-center justify-center mb-6 px-4">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-white/80 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm font-medium">{L.processing}</span>
                </div>
              ) : showDone ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{L.done}</span>
                </div>
              ) : isListening && interimTranscript ? (
                <p className="text-white/90 text-sm text-center max-w-xs truncate bg-white/5 py-1 px-3 rounded-full border border-white/10">
                  {interimTranscript}
                </p>
              ) : isListening ? (
                <p className="text-white/60 text-sm animate-pulse">
                  {L.listening}
                </p>
              ) : error ? (
                <div className="flex items-center gap-2">
                  <p className="text-red-400 text-xs text-center max-w-xs">
                    {error}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {L.retry}
                  </button>
                </div>
              ) : (
                <p className="text-white/40 text-sm">{L.tapToSpeak}</p>
              )}
            </div>

            {/* Mic button */}
            <motion.button
              onClick={handleToggle}
              disabled={isProcessing}
              aria-label={isListening ? L.tapToStop : L.tapToSpeak}
              className={`relative h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-all disabled:opacity-50 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 shadow-red-500/40"
                  : "bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-blue-500/30"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Pulse ring when listening */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/40"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {isListening ? (
                <MicOff className="w-8 h-8 text-white relative z-10" />
              ) : (
                <Mic className="w-8 h-8 text-white relative z-10" />
              )}
            </motion.button>

            <p className="text-white/50 text-xs mt-3 mb-5">
              {isListening ? L.tapToStop : L.tapToSpeak}
            </p>

            {/* Language picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen((p) => !p)}
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors border border-white/10"
              >
                <span className="text-base">
                  {toFlagEmoji(selectedLang.flag)}
                </span>
                <span className="text-white text-sm font-medium">
                  {selectedLang.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/60" />
              </button>

              <AnimatePresence>
                {pickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-[#1a1a2e] border border-white/15 rounded-2xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto z-[100]"
                  >
                    {VOICE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLang(lang)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/10 ${
                          selectedLang.code === lang.code
                            ? "bg-white/15 text-blue-400 font-medium"
                            : "text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">
                            {toFlagEmoji(lang.flag)}
                          </span>
                          <span>{lang.label}</span>
                        </div>
                        {selectedLang.code === lang.code && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
