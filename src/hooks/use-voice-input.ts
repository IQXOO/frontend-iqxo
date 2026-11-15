"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useApp } from "../lib/store";
import { isAudioSupported } from "../lib/openai-voice";
import { ParsedEvent } from "../lib/parse-voice-input";
import {
  devError,
  devLog,
  devWarn,
  fetchWithDiagnostics,
  getFriendlyErrorMessage,
  readResponseText,
} from "../lib/logger";
import { useToast } from "../hooks/use-toast";

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface VoiceLang {
  code: string;
  label: string;
  flag: string;
}

// Comprehensive language list - Web Speech API supports all of these
export const VOICE_LANGUAGES: VoiceLang[] = [
  { code: "en-US", label: "English", flag: "US" },
  { code: "fr-FR", label: "Français", flag: "FR" },
  { code: "it-IT", label: "Italiano", flag: "IT" },
  { code: "es-ES", label: "Español", flag: "ES" },
  { code: "de-DE", label: "Deutsch", flag: "DE" },
  { code: "pt-BR", label: "Português", flag: "BR" },
  { code: "tr-TR", label: "Türkçe", flag: "TR" },
  { code: "hi-IN", label: "Hindi", flag: "IN" },
  { code: "ja-JP", label: "日本語", flag: "JP" },
  { code: "zh-CN", label: "中文", flag: "CN" },
  { code: "ko-KR", label: "한국어", flag: "KR" },
  { code: "ru-RU", label: "Русский", flag: "RU" },
  { code: "nl-NL", label: "Nederlands", flag: "NL" },
  { code: "pl-PL", label: "Polski", flag: "PL" },
  { code: "ar-EG", label: "عربي مصري", flag: "EG" },
  { code: "ar-SA", label: "عربي خليجي", flag: "SA" },
];

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: (langCode?: string) => Promise<void>;
  stopListening: () => Promise<void>;
  cancelListening: () => void;
  changeLanguage: (langCode: string) => void;
  resetVoiceState: () => void;
  isSupported: boolean;
  error: string | null;
  isProcessing: boolean;
  speechRecognitionFailed: boolean;
  eventData: ParsedEvent | null;
}

function checkIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function resetIOSAudioSession() {
  if (typeof navigator !== "undefined" && (navigator as any).audioSession) {
    try {
      (navigator as any).audioSession.type = "playback";
      (navigator as any).audioSession.type = "auto";
    } catch (_) {}
  }
}

function activateIOSRecordingSession() {
  if (typeof navigator !== "undefined" && (navigator as any).audioSession) {
    try {
      (navigator as any).audioSession.type = "play-and-record";
    } catch (_) {}
  }
}

export function useVoiceInput(): UseVoiceInputReturn {
  const { user, session, setTotalUsage, language } = useApp();
  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechRecognitionFailed, setSpeechRecognitionFailed] = useState(false);
  const [eventData, setEventData] = useState<ParsedEvent | null>(null);

  // Native hardware and recognizer refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStreamStopTimeRef = useRef<number>(0);

  // Lifecycle flags
  const isRecognitionActiveRef = useRef(false);
  const currentLangRef = useRef("");
  const accumulatedTextRef = useRef("");

  // Check hardware and browser support on mount
  useEffect(() => {
    const audioSupported = isAudioSupported();
    const speechSupported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    const supported = audioSupported || speechSupported;
    devLog("Voice", "Audio support check completed", {
      audioSupported,
      speechSupported,
      supported,
    });
    setIsSupported(supported);

    if (!supported) {
      devWarn("Voice", "Voice input is not supported in this browser");
    }
  }, []);

  /**
   * Complete, safe resource cleanup.
   * Cancels any active recognition, stops recorder, releases audio tracks.
   * Guarantees zero dangling mic locks.
   */
  const cleanupAllResources = useCallback(() => {
    isRecognitionActiveRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Abort speech recognition immediately to release native microphone focus
    if (speechRecognitionRef.current) {
      const sr = speechRecognitionRef.current;
      speechRecognitionRef.current = null;
      sr.onstart = null;
      sr.onresult = null;
      sr.onerror = null;
      sr.onend = null;
      try {
        sr.abort();
      } catch (_) {}
    }

    // Stop MediaRecorder cleanly without triggering unwanted onstop events
    if (mediaRecorderRef.current) {
      const mr = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      mr.ondataavailable = null;
      mr.onerror = null;
      mr.onstop = null;
      if (mr.state !== "inactive") {
        try {
          mr.stop();
        } catch (_) {}
      }
    }

    // Release all MediaStream tracks immediately
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
      } catch (_) {}
      streamRef.current = null;
      lastStreamStopTimeRef.current = Date.now();
    }
    resetIOSAudioSession();

    audioChunksRef.current = [];
  }, []);

  // Cleanup immediately when unmounting to prevent background mic leaks
  useEffect(() => {
    return () => {
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  /**
   * Abort and cancel voice session immediately.
   * Does NOT trigger backend request or deduct API balance.
   */
  const cancelListening = useCallback(() => {
    devLog("Voice", "Cancelling voice input and resetting state");
    cleanupAllResources();
    setIsListening(false);
    setIsProcessing(false);
    setInterimTranscript("");
    setError(null);
  }, [cleanupAllResources]);

  /**
   * Reset all voice state so user can retry or re-record cleanly.
   */
  const resetVoiceState = useCallback(() => {
    cancelListening();
    setTranscript("");
    setEventData(null);
    setError(null);
    setSpeechRecognitionFailed(false);
  }, [cancelListening]);

  /**
   * Start listening and recording audio.
   */
  const startListening = useCallback(
    async (langCode?: string) => {
      devLog("Voice", "Starting voice input", { langCode });

      // First cleanly abort any previous session
      cleanupAllResources();

      const defaultLang =
        langCode ||
        currentLangRef.current ||
        (language === "ar"
          ? "ar-EG"
          : language === "fr"
            ? "fr-FR"
            : typeof navigator !== "undefined"
              ? navigator.language
              : "") ||
        "en-US";

      currentLangRef.current = defaultLang;

      if (!isSupported) {
        const errorMsg = "Voice input is not supported in this browser";
        setError(errorMsg);
        devWarn("Voice", errorMsg);
        toast({
          title: "Voice input unavailable",
          description: "Your browser doesn't support voice input on this device.",
          variant: "destructive",
        });
        return;
      }

      setError(null);
      setTranscript("");
      setInterimTranscript("");
      setEventData(null);
      setSpeechRecognitionFailed(false);
      audioChunksRef.current = [];
      accumulatedTextRef.current = "";
      isRecognitionActiveRef.current = true;

      // Ensure iOS/WebKit and mobile audio hardware release cooldown (350ms) before requesting mic again
      const elapsed = Date.now() - lastStreamStopTimeRef.current;
      if (elapsed < 350) {
        await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
      }
      if (!isRecognitionActiveRef.current) return;

      activateIOSRecordingSession();

      try {
        // ── Universal Audio Recording Flow (iOS, Android, and Desktop/Web) ──
        if (
          typeof window === "undefined" ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            "Microphone access is not supported or requires HTTPS context.",
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isRecognitionActiveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          lastStreamStopTimeRef.current = Date.now();
          resetIOSAudioSession();
          return;
        }

        const isIOS = checkIsIOS();

        // If iOS initially mutes the track while setting up AVAudioSession, wait for it to unmute
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = true;
          if (audioTracks[0].muted) {
            devLog("Voice", "Audio track initially muted by iOS, waiting for hardware activation...");
            await new Promise<void>((resolve) => {
              const track = audioTracks[0];
              let done = false;
              const timeout = setTimeout(() => {
                if (!done) {
                  done = true;
                  resolve();
                }
              }, 800);
              track.onunmute = () => {
                if (!done) {
                  done = true;
                  clearTimeout(timeout);
                  devLog("Voice", "Audio track unmuted successfully by iOS");
                  resolve();
                }
              };
            });
          }
        }

        streamRef.current = stream;

        const supportedMimeType = isIOS
          ? (MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "")
          : (MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm");

        const mediaRecorder = new MediaRecorder(
          stream,
          supportedMimeType ? { mimeType: supportedMimeType } : undefined
        );

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Subtitle speech recognition:
        // Provide smooth real-time live subtitle transcription across all platforms (Mobile, Desktop, iOS Safari, Android)
        const SpeechRecognitionAPI =
          typeof window !== "undefined" &&
          (window.SpeechRecognition || window.webkitSpeechRecognition);

        if (SpeechRecognitionAPI) {
          let consecutiveErrors = 0;

          const createSubtitleRecognition = () => {
            if (!isRecognitionActiveRef.current) return;
            if (consecutiveErrors >= 3) {
              devWarn("Voice", "Stopping live subtitle retries after consecutive errors");
              return;
            }

            try {
              const sr = new SpeechRecognitionAPI();
              sr.continuous = true;
              sr.interimResults = true;
              sr.maxAlternatives = 1;
              sr.lang = currentLangRef.current || defaultLang;

              sr.onstart = () => {
                consecutiveErrors = 0;
              };

              sr.onresult = (e: SpeechRecognitionEvent) => {
                if (!isRecognitionActiveRef.current) return;
                consecutiveErrors = 0;
                let currentFinal = "";
                let currentInterim = "";

                for (let i = 0; i < e.results.length; i++) {
                  const res = e.results[i];
                  if (res && res[0]) {
                    if (res.isFinal) {
                      currentFinal += res[0].transcript + " ";
                    } else {
                      currentInterim += res[0].transcript;
                    }
                  }
                }

                const base = accumulatedTextRef.current ? accumulatedTextRef.current + " " : "";
                const fullText = (base + currentFinal + currentInterim).trim();
                if (fullText) {
                  setInterimTranscript(fullText);
                }
              };

              sr.onerror = (e) => {
                devWarn("Voice", "Live speech recognition error (non-fatal)", {
                  error: e.error,
                });
                if (e.error === "not-allowed" || e.error === "service-not-allowed") {
                  consecutiveErrors = 99; // Never retry fatal permission errors
                  return;
                }
                if (e.error !== "no-speech") {
                  consecutiveErrors++;
                }
              };

              sr.onend = () => {
                if (!isRecognitionActiveRef.current) return;

                // Save current accumulated text so next segment continues seamlessly
                setInterimTranscript((latest) => {
                  if (latest) accumulatedTextRef.current = latest;
                  return latest;
                });

                if (consecutiveErrors < 3) {
                  restartTimerRef.current = setTimeout(() => {
                    createSubtitleRecognition();
                  }, 300);
                }
              };

              speechRecognitionRef.current = sr;
              sr.start();
            } catch (err) {
              devWarn("Voice", "Failed to start subtitle SpeechRecognition", err);
              consecutiveErrors++;
            }
          };

          createSubtitleRecognition();
        }

        mediaRecorder.onstart = () => {
          devLog("Voice", "Audio recording started");
          setIsListening(true);
        };

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onerror = (event: Event) => {
          devError("Voice", "MediaRecorder error", event);
          cleanupAllResources();
          const message = "Audio recording failed. Please try again.";
          setError(message);
          toast({
            title: "Recording failed",
            description: message,
            variant: "destructive",
          });
          setIsListening(false);
          setIsProcessing(false);
        };

        mediaRecorder.onstop = async () => {
          devLog("Voice", "Audio recording stopped, processing...");
          setIsListening(false);
          setIsProcessing(true);
          setInterimTranscript("");

          // Clean up live speech recognition
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.abort();
            } catch (_) {}
            speechRecognitionRef.current = null;
          }

          // Allow a macrotask tick (120ms on iOS) to ensure the final ondataavailable event has been dispatched
          await new Promise((r) => setTimeout(r, isIOS ? 120 : 60));

          // Build audio blob safely
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || (isIOS ? "audio/mp4" : "audio/webm"),
          });

          // NOW release the media stream tracks cleanly
          if (streamRef.current) {
            try {
              streamRef.current.getTracks().forEach((track) => track.stop());
            } catch (_) {}
            streamRef.current = null;
            lastStreamStopTimeRef.current = Date.now();
          }
          mediaRecorderRef.current = null;
          resetIOSAudioSession();

          const spokenText = (
            accumulatedTextRef.current ||
            interimTranscript ||
            ""
          ).trim();

          if (audioBlob.size === 0 && !spokenText) {
            setIsProcessing(false);
            setError(
              language === "ar"
                ? "لم يتم التقاط أي صوت، يرجى التحدث مرة أخرى."
                : "No audio captured. Please speak again.",
            );
            return;
          }

          try {
            const formData = new FormData();
            if (audioBlob.size > 0) {
              const fileExtension = audioBlob.type.includes("mp4") ? "m4a" : "webm";
              formData.append("audio", audioBlob, `recording.${fileExtension}`);
            }
            if (spokenText) {
              formData.append("text", spokenText);
            }

            if (user?.id) formData.append("userId", user.id);
            if (currentLangRef.current) {
              formData.append("language", currentLangRef.current.split("-")[0]);
            }
            formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            formData.append("clientDate", localDate);

            const headers: Record<string, string> = {};
            if (session?.access_token) {
              headers["Authorization"] = `Bearer ${session.access_token}`;
            }

            const response = await fetchWithDiagnostics(
              "Voice",
              "POST /analyze-voice",
              `${import.meta.env.VITE_BACKEND_API}/analyze-voice`,
              {
                method: "POST",
                headers,
                body: formData,
              },
              {
                timeoutMs: 30000,
                context: { mimeType: audioBlob.type, size: audioBlob.size },
              },
            );

            if (!response.ok) {
              const responseText = await readResponseText(response);
              let serverMsg = responseText;
              try {
                const parsed = JSON.parse(responseText);
                if (parsed?.error) serverMsg = parsed.error;
              } catch (_) {}
              if (
                serverMsg.includes("No audio") ||
                serverMsg.includes("no text")
              ) {
                serverMsg =
                  language === "ar"
                    ? "لم يتم سماع أي صوت واضح، يرجى إعادة التحدث."
                    : language === "fr"
                      ? "Aucun son détecté. Veuillez réessayer."
                      : "No clear speech detected. Please speak again.";
              }
              throw new Error(serverMsg || `Server error: ${response.status}`);
            }

            const result = await response.json();
            devLog("Voice", "Voice analysis response received", {
              hasTranscript: Boolean(result.transcript || result.text),
              hasEvent: Boolean(result.event),
            });

            if (result.event) {
              setEventData(result.event);
            }

            const transcription = result.transcript || result.text || "";
            setTranscript(transcription);

            if (typeof result.total_usage === "number") {
              setTotalUsage(result.total_usage);
            }
          } catch (transcriptionError) {
            devError("Voice", "Transcription failed", transcriptionError);
            const message = getFriendlyErrorMessage(
              transcriptionError,
              "Failed to process voice message",
            );
            setError(message);
            toast({
              title: "Couldn't process voice message",
              description: message,
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        };

        // Calling start() without arguments produces a single, complete, valid audio container upon stop()
        // across all platforms (iOS, Android, and Desktop) avoiding chunk-flushing race conditions.
        mediaRecorder.start();
        devLog("Voice", "MediaRecorder start() called", { isIOS });
      } catch (err) {
        cleanupAllResources();
        devError("Voice", "Error starting voice input", err);
        const message = getFriendlyErrorMessage(
          err,
          "Failed to start voice input",
        );
        setError(message);
        toast({
          title: "Couldn't start voice input",
          description: message,
          variant: "destructive",
        });
        setIsListening(false);
        setIsProcessing(false);
      }
    },
    [isSupported, language, user, session, setTotalUsage, toast, cleanupAllResources],
  );

  /**
   * Seamless language switching.
   * Allows changing the language anytime without freezing or restarting the app.
   */
  const changeLanguage = useCallback(
    (langCode: string) => {
      devLog("Voice", "Language switched to", { langCode });
      currentLangRef.current = langCode;

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch (_) {}
      }
    },
    [],
  );

  /**
   * Stop listening and finalize recognition cleanly across all platforms.
   */
  const stopListening = useCallback(async () => {
    devLog("Voice", "Stopping voice input");
    isRecognitionActiveRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop(); // onstop handles assembling blob, releasing stream and backend analysis
      } catch (err) {
        devWarn("Voice", "Error calling mediaRecorder.stop()", err);
        cleanupAllResources();
        setIsListening(false);
        setIsProcessing(false);
      }
    } else {
      cleanupAllResources();
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [cleanupAllResources]);

  return {
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
    speechRecognitionFailed,
    eventData,
  };
}

export type { ParsedEvent };
