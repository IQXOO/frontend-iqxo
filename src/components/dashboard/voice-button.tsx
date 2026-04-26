"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  ChevronDown,
  X,
  Loader2,
  CheckCircle,
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
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
    isProcessing,
    eventData,
  } = useVoiceInput();

  const { language } = useApp();
  const isRTL = language === "ar";

  const [selectedLang, setSelectedLang] = useState<VoiceLang>(
    VOICE_LANGUAGES[2],
  ); // en-US default
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onCloseRef = useRef(onClose);
  const callbackFiredRef = useRef(false);

  onTranscriptRef.current = onTranscript;
  onCloseRef.current = onClose;

  // Load saved language
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_VOICE_LANG);
    if (saved) {
      const found = VOICE_LANGUAGES.find((l) => l.code === saved);
      if (found) setSelectedLang(found);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_VOICE_LANG, selectedLang.code);
  }, [selectedLang]);

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

  // Fire callback when transcription is ready
  useEffect(() => {
    if (isListening) {
      callbackFiredRef.current = false;
      return;
    }
    if (isProcessing) return;

    const data = eventData ?? (transcript.trim() || null);
    if (!data || callbackFiredRef.current) return;

    callbackFiredRef.current = true;

    setTimeout(() => {
      onTranscriptRef.current(data);
      setShowDone(true);
      setTimeout(() => {
        setShowDone(false);
        onCloseRef.current?.();
      }, 1200);
    }, 50);
  }, [isListening, isProcessing, transcript, eventData]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      callbackFiredRef.current = false;
      setShowDone(false);
      startListening(selectedLang.code);
    }
  }, [isListening, startListening, stopListening, selectedLang]);

  const handleClose = useCallback(() => {
    if (isListening) stopListening();
    onClose?.();
  }, [isListening, stopListening, onClose]);

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
        ? "جاري المعالجة..."
        : language === "fr"
          ? "Traitement..."
          : "Processing...",
    done: language === "ar" ? "تم!" : language === "fr" ? "Fait!" : "Done!",
    tapToSpeak:
      language === "ar"
        ? "اضغط للتحدث"
        : language === "fr"
          ? "Appuyez pour parler"
          : "Tap to speak",
    tapToStop:
      language === "ar"
        ? "اضغط للإيقاف"
        : language === "fr"
          ? "Appuyez pour arrêter"
          : "Tap to stop",
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
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center pb-16 pt-6 px-6"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Title */}
            <h2 className="text-white text-lg font-semibold mb-2">
              {L.speakNow}
            </h2>

            {/* Status line */}
            <div className="h-8 flex items-center justify-center mb-6">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{L.processing}</span>
                </div>
              ) : showDone ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{L.done}</span>
                </div>
              ) : isListening && interimTranscript ? (
                <p className="text-white/80 text-sm text-center max-w-xs truncate">
                  {interimTranscript}
                </p>
              ) : isListening ? (
                <p className="text-white/50 text-sm animate-pulse">
                  {L.listening}
                </p>
              ) : error ? (
                <p className="text-red-400 text-xs text-center max-w-xs">
                  {error}
                </p>
              ) : (
                <p className="text-white/40 text-sm">{L.tapToSpeak}</p>
              )}
            </div>

            {/* Mic button */}
            <motion.button
              onClick={handleToggle}
              disabled={isProcessing}
              className={`relative h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-colors disabled:opacity-50 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
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

            <p className="text-white/40 text-xs mt-3 mb-5">
              {isListening ? L.tapToStop : L.tapToSpeak}
            </p>

            {/* Language picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen((p) => !p)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
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
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto"
                  >
                    {VOICE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang);
                          setPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/10 ${
                          selectedLang.code === lang.code
                            ? "bg-white/10 text-white"
                            : "text-white/70"
                        }`}
                      >
                        <span className="text-base">
                          {toFlagEmoji(lang.flag)}
                        </span>
                        <span>{lang.label}</span>
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
