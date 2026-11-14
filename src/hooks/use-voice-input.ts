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
  { code: "ar-EG", label: "عربي مصري", flag: "EG" },
  { code: "ar-SA", label: "عربي خليجي", flag: "SA" },
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
  const accumulatedTranscriptRef = useRef("");
  const sessionFinalRef = useRef("");
  const displayBaseRef = useRef("");
  const isAndroidModeRef = useRef(false);
  const sessionCommittedRef = useRef(false);
  const currentLangRef = useRef("");

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
      isRecognitionActiveRef.current = true;
      accumulatedTranscriptRef.current = "";
      sessionFinalRef.current = "";
      sessionCommittedRef.current = false;
      displayBaseRef.current = "";

      // Ensure iOS/WebKit audio hardware release cooldown (300ms) before requesting mic again
      const elapsed = Date.now() - lastStreamStopTimeRef.current;
      if (elapsed < 300) {
        await new Promise((resolve) => setTimeout(resolve, 300 - elapsed));
      }
      if (!isRecognitionActiveRef.current) return;

      try {
        const isAndroidPlatform =
          typeof navigator !== "undefined" &&
          /Android/i.test(navigator.userAgent);
        isAndroidModeRef.current = isAndroidPlatform;

        // ── Android Flow (Direct Web Speech API) ──────────────────────────
        if (isAndroidPlatform) {
          const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;

          if (!SpeechRecognitionAPI) {
            isRecognitionActiveRef.current = false;
            setIsListening(false);
            throw new Error(
              "Speech recognition API not supported on this browser/device.",
            );
          }

          // Safety pause (100ms) to ensure previous native speech service released
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (!isRecognitionActiveRef.current) return;

          const startAndroidSpeech = () => {
            if (!isRecognitionActiveRef.current) return;

            sessionFinalRef.current = "";
            sessionCommittedRef.current = false;

            let speechRecognition: SpeechRecognition;
            try {
              speechRecognition = new SpeechRecognitionAPI();
            } catch (instError) {
              devError("Voice", "Failed to construct SpeechRecognition", instError);
              isRecognitionActiveRef.current = false;
              setIsListening(false);
              return;
            }

            speechRecognition.continuous = true;
            speechRecognition.interimResults = true;
            speechRecognition.maxAlternatives = 1;
            speechRecognition.lang = currentLangRef.current || defaultLang;

            speechRecognition.onstart = () => {
              devLog("Voice", "Speech recognition session started (Android Mode)");
              setIsListening(true);
            };

            speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
              if (!isRecognitionActiveRef.current) return;

              let interim = "";
              let final = "";

              for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                  final += result[0].transcript;
                } else {
                  interim += result[0].transcript;
                }
              }

              if (final) {
                sessionFinalRef.current = final.trim();
                displayBaseRef.current = final.trim();
                setInterimTranscript(displayBaseRef.current);

                const preview = accumulatedTranscriptRef.current
                  ? accumulatedTranscriptRef.current + " " + sessionFinalRef.current
                  : sessionFinalRef.current;
                setTranscript(preview.trim());
                devLog("Voice", "Speech final chunk (Android Mode)", {
                  transcript: final,
                });
              } else if (interim) {
                setInterimTranscript(
                  displayBaseRef.current
                    ? displayBaseRef.current + " " + interim.trim()
                    : interim.trim(),
                );
              }
            };

            speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
              devWarn("Voice", "Speech recognition error (Android Mode)", {
                error: event.error,
              });

              if (
                event.error === "not-allowed" ||
                event.error === "service-not-allowed"
              ) {
                isRecognitionActiveRef.current = false;
                setIsListening(false);
                setError(
                  language === "ar"
                    ? "تم رفض إذن الوصول إلى المايكروفون."
                    : "Microphone permission denied.",
                );
                return;
              }

              if (
                event.error !== "no-speech" &&
                event.error !== "aborted" &&
                event.error !== "network"
              ) {
                setError(`Error: ${event.error}`);
                setSpeechRecognitionFailed(true);
              }
            };

            speechRecognition.onend = () => {
              devLog("Voice", "Speech recognition session ended (Android Mode)");

              if (sessionFinalRef.current && !sessionCommittedRef.current) {
                accumulatedTranscriptRef.current = accumulatedTranscriptRef.current
                  ? accumulatedTranscriptRef.current + " " + sessionFinalRef.current
                  : sessionFinalRef.current;
                sessionCommittedRef.current = true;
              }

              // Only auto-restart if still actively listening
              if (isRecognitionActiveRef.current) {
                displayBaseRef.current = sessionFinalRef.current;
                // Throttled 150ms restart to avoid crashing native speech engine
                restartTimerRef.current = setTimeout(() => {
                  if (isRecognitionActiveRef.current) {
                    startAndroidSpeech();
                  }
                }, 150);
              }
            };

            speechRecognitionRef.current = speechRecognition;
            try {
              speechRecognition.start();
            } catch (err) {
              devWarn("Voice", "Failed to start Android SpeechRecognition", err);
              // One-time retry if engine was temporarily busy
              restartTimerRef.current = setTimeout(() => {
                if (isRecognitionActiveRef.current) {
                  try {
                    const retrySR = new SpeechRecognitionAPI();
                    retrySR.continuous = true;
                    retrySR.interimResults = true;
                    retrySR.lang = currentLangRef.current || defaultLang;
                    retrySR.start();
                    speechRecognitionRef.current = retrySR;
                  } catch (_) {}
                }
              }, 250);
            }
          };

          startAndroidSpeech();
          return;
        }

        // ── iOS & Desktop Flow (MediaRecorder + Subtitle SpeechRecognition) ──
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
          return;
        }

        // If iOS initially mutes the track while setting up AVAudioSession, wait briefly for it to unmute
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].muted) {
          await new Promise<void>((resolve) => {
            const track = audioTracks[0];
            const timeout = setTimeout(resolve, 300);
            track.onunmute = () => {
              clearTimeout(timeout);
              resolve();
            };
          });
        }

        streamRef.current = stream;

        const supportedMimeType = MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: supportedMimeType,
        });

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Check if device is iOS (iPhone/iPad/WKWebView)
        const isIOS =
          typeof navigator !== "undefined" &&
          (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

        // Subtitle speech recognition:
        // CRITICAL FIX: On iOS WebKit, running SpeechRecognition and MediaRecorder simultaneously
        // causes hardware AVAudioSession conflict, muting the microphone on subsequent recordings.
        // Therefore, disable parallel SpeechRecognition on iOS so MediaRecorder has exclusive access.
        const SpeechRecognitionAPI =
          !isIOS &&
          (window.SpeechRecognition || window.webkitSpeechRecognition);

        if (SpeechRecognitionAPI) {
          const createSubtitleRecognition = () => {
            if (!isRecognitionActiveRef.current) return;
            try {
              const sr = new SpeechRecognitionAPI();
              sr.continuous = true;
              sr.interimResults = true;
              sr.maxAlternatives = 1;
              sr.lang = currentLangRef.current || defaultLang;

              sr.onresult = (e: SpeechRecognitionEvent) => {
                if (!isRecognitionActiveRef.current) return;
                let interim = "";
                let final = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                  if (e.results[i].isFinal) final += e.results[i][0].transcript;
                  else interim += e.results[i][0].transcript;
                }
                if (interim) setInterimTranscript(interim);
                if (final) setInterimTranscript(final);
              };

              sr.onerror = (e) => {
                devWarn("Voice", "Subtitle recognition error (non-fatal)", {
                  error: e.error,
                });
              };

              sr.onend = () => {
                if (isRecognitionActiveRef.current) {
                  restartTimerRef.current = setTimeout(() => {
                    createSubtitleRecognition();
                  }, 150);
                }
              };

              speechRecognitionRef.current = sr;
              sr.start();
            } catch (err) {
              devWarn("Voice", "Failed to start subtitle SpeechRecognition", err);
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

          // Allow a macrotask tick (60ms) to ensure the final ondataavailable event has been dispatched
          await new Promise((r) => setTimeout(r, 60));

          // Build audio blob safely
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || "audio/webm",
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

          if (audioBlob.size === 0) {
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
            const fileExtension = audioBlob.type.includes("mp4") ? "m4a" : "webm";
            formData.append("audio", audioBlob, `recording.${fileExtension}`);

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

        try {
          mediaRecorder.start(500); // Collect chunk every 500ms
        } catch (_) {
          mediaRecorder.start();
        }
        devLog("Voice", "MediaRecorder start() called");
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

      // If currently recording, smoothly restart recognition with the new language
      if (isRecognitionActiveRef.current) {
        if (isAndroidModeRef.current) {
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.abort();
            } catch (_) {}
          }
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isRecognitionActiveRef.current) {
              startListening(langCode);
            }
          }, 100);
        } else {
          // Non-Android: restart subtitle recognizer with the new language
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.abort();
            } catch (_) {}
          }
        }
      }
    },
    [startListening],
  );

  /**
   * Stop listening and finalize recognition.
   */
  const stopListening = useCallback(async () => {
    devLog("Voice", "Stopping voice input");
    isRecognitionActiveRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // ── Android Stop Flow ──────────────────────────────────────────
    if (isAndroidModeRef.current) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }

      setIsListening(false);
      setInterimTranscript("");
      setSpeechRecognitionFailed(false);

      if (sessionFinalRef.current && !sessionCommittedRef.current) {
        accumulatedTranscriptRef.current = accumulatedTranscriptRef.current
          ? accumulatedTranscriptRef.current + " " + sessionFinalRef.current
          : sessionFinalRef.current;
        sessionCommittedRef.current = true;
        sessionFinalRef.current = "";
      }

      const finalResult = accumulatedTranscriptRef.current.trim();
      devLog("Voice", "Android final transcript ready", {
        length: finalResult.length,
      });

      if (!finalResult) {
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("text", finalResult);
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
          { timeoutMs: 30000, context: { textLength: finalResult.length } },
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
        devLog("Voice", "Android voice analysis response received", {
          hasEvent: Boolean(result.event),
        });

        if (result.event) {
          setEventData(result.event);
        }

        const transcription = result.transcript || result.text || finalResult;
        setTranscript(transcription);

        if (typeof result.total_usage === "number") {
          setTotalUsage(result.total_usage);
        }
      } catch (err) {
        devError("Voice", "Android text submission failed", err);
        const message = getFriendlyErrorMessage(
          err,
          "Failed to process text description",
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
      return;
    }

    // ── Non-Android Stop Flow ──────────────────────────────────────────
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
        if (
          typeof mediaRecorderRef.current.requestData === "function" &&
          mediaRecorderRef.current.state === "recording"
        ) {
          try {
            mediaRecorderRef.current.requestData();
          } catch (_) {}
        }
        mediaRecorderRef.current.stop(); // onstop handles processing and releasing stream
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
  }, [user, session, setTotalUsage, toast, cleanupAllResources, language]);

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
