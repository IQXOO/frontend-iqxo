"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useApp } from "../lib/store";
import {
  isAudioSupported,
} from "../lib/openai-voice";
import { ParsedEvent } from "../lib/parse-voice-input";
import { devError, devLog, devWarn, fetchWithDiagnostics, getFriendlyErrorMessage, readResponseText } from "../lib/logger";
import { useToast } from "../hooks/use-toast";

// Type declarations for Web Speech API (for interim results)
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
  { code: "ar-EG", label: "عربي مصري", flag: "EG" },
  { code: "ar-SA", label: "عربي خليجي", flag: "SA" },
  { code: "en-US", label: "English", flag: "US" },
  { code: "fr-FR", label: "Francais", flag: "FR" },
  { code: "it-IT", label: "Italiano", flag: "IT" },
  { code: "es-ES", label: "Espanol", flag: "ES" },
  { code: "de-DE", label: "Deutsch", flag: "DE" },
  { code: "pt-BR", label: "Portugues", flag: "BR" },
  { code: "tr-TR", label: "Turkce", flag: "TR" },
  { code: "hi-IN", label: "Hindi", flag: "IN" },
  { code: "ja-JP", label: "日本語", flag: "JP" },
  { code: "zh-CN", label: "中文", flag: "CN" },
  { code: "ko-KR", label: "한국어", flag: "KR" },
  { code: "ru-RU", label: "Русский", flag: "RU" },
  { code: "nl-NL", label: "Nederlands", flag: "NL" },
  { code: "pl-PL", label: "Polski", flag: "PL" },
];

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: (langCode?: string) => void;
  stopListening: () => void;
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
  const [isSupported, setIsSupported] = useState(true); // default true to avoid hydration flash
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechRecognitionFailed, setSpeechRecognitionFailed] = useState(false);
  const [eventData, setEventData] = useState<ParsedEvent | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecognitionActiveRef = useRef(false);
  const audioCaptureRetryCountRef = useRef(0);
  const accumulatedTranscriptRef = useRef(""); // للباك اند — يجمع الجمل المكتملة عند نهاية كل جلسة
  const sessionFinalRef = useRef("");           // آخر نتيجة نهائية داخل الجلسة الحالية فقط
  const displayBaseRef = useRef("");             // للعرض — آخر جملة مؤكدة في الجلسة الحالية
  // يسجّل القرار مرة واحدة عند start ويُعاد قراءته في stop — لضمان تطابق المسار
  const isAndroidModeRef = useRef(false);
  // guard: يمنع إضافة sessionFinalRef مرتين (مرة في flush ومرة في onend)
  const sessionCommittedRef = useRef(false);

  // Convert WebM to WAV format
  const _convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // For now, just return the original blob with WAV mimetype
          // Your server should handle the actual conversion
          // This is a simpler approach that should work
          const wavBlob = new Blob([webmBlob], { type: "audio/wav" });
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(webmBlob);
    });
  };

  // Check support after hydration
  useEffect(() => {
    const audioSupported = isAudioSupported();
    const speechSupported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    const supported = audioSupported || speechSupported;

    devLog('Voice', 'Audio support check completed', { audioSupported, speechSupported, supported });
    setIsSupported(supported);

    if (!supported) {
      devWarn('Voice', 'Voice input is not supported in this browser');
    }
  }, []);

  const startListening = useCallback(
    async (langCode?: string) => {
      devLog('Voice', 'Starting voice input');

      if (!isSupported) {
        const errorMsg = "Voice input is not supported in this browser";
        setError(errorMsg);
        devWarn('Voice', errorMsg);
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
      setEventData(null); // reset previous result so it never bleeds into next analysis
      setSpeechRecognitionFailed(false);
      audioChunksRef.current = [];
      isRecognitionActiveRef.current = true;
      audioCaptureRetryCountRef.current = 0;
      accumulatedTranscriptRef.current = "";
      sessionFinalRef.current = "";
      sessionCommittedRef.current = false;
      displayBaseRef.current = "";

      try {
        // نحدد المسار مرة واحدة ونخزنه — سيتم استخدامه دون إعادة حساب في stopListening
        const isAndroidPlatform = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
        isAndroidModeRef.current = isAndroidPlatform;

        if (isAndroidPlatform) {
          const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;

          if (!SpeechRecognitionAPI) {
            throw new Error("Speech recognition API not supported on this browser/device.");
          }

          const startAndroidSpeech = () => {
            if (!isRecognitionActiveRef.current) return;

            // Reset per-session state for the new session
            sessionFinalRef.current = "";
            sessionCommittedRef.current = false;

            // Re-instantiate to avoid Android Chrome state locks
            const speechRecognition = new SpeechRecognitionAPI();
            speechRecognition.continuous = true;
            speechRecognition.interimResults = true;
            speechRecognition.maxAlternatives = 1;
            speechRecognition.lang = langCode || (typeof navigator !== 'undefined' ? navigator.language : '') || "ar-EG";

            speechRecognition.onstart = () => {
              devLog('Voice', 'Speech recognition session started (Android Mode)');
              setIsListening(true);
            };

            speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
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
                // = داخل الجلسة: نتابع فقط آخر نتيجة نهائية (Chrome يرسل كل كلمة بشكل متراكم)
                sessionFinalRef.current = final.trim();
                displayBaseRef.current = final.trim();
                setInterimTranscript(displayBaseRef.current);
                // للعرض الكلي: كل الجلسات السابقة + الجلسة الحالية
                const preview = accumulatedTranscriptRef.current
                  ? accumulatedTranscriptRef.current + " " + sessionFinalRef.current
                  : sessionFinalRef.current;
                setTranscript(preview.trim());
                devLog('Voice', 'Speech final chunk (Android Mode)', { transcript: final });
              } else if (interim) {
                // الـ interim يظهر بعد الجملة الأخيرة المؤكدة فقط
                setInterimTranscript(
                  displayBaseRef.current
                    ? displayBaseRef.current + " " + interim.trim()
                    : interim.trim()
                );
              }
            };

            speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
              devWarn('Voice', 'Speech recognition error (Android Mode)', { error: event.error });
              
              // Ignore harmless errors like silence or aborts so they don't break the UI
              if (event.error !== "no-speech" && event.error !== "aborted" && event.error !== "network") {
                setError(`Error: ${event.error}`);
                setSpeechRecognitionFailed(true);
              }
            };

            speechRecognition.onend = () => {
              devLog('Voice', 'Speech recognition session ended (Android Mode)');

              // commit دائماً — لكن مرة واحدة فقط (guard يمنع التكرار مع flush)
              if (sessionFinalRef.current && !sessionCommittedRef.current) {
                accumulatedTranscriptRef.current = accumulatedTranscriptRef.current
                  ? accumulatedTranscriptRef.current + " " + sessionFinalRef.current
                  : sessionFinalRef.current;
                sessionCommittedRef.current = true;
              }

              if (isRecognitionActiveRef.current) {
                // الشاشة تبدأ من آخر جملة مؤكدة في الجلسة السابقة
                displayBaseRef.current = sessionFinalRef.current;
                setTimeout(() => {
                  startAndroidSpeech();
                }, 0);
              }
            };

            speechRecognitionRef.current = speechRecognition;
            try {
              speechRecognition.start();
            } catch (err) {
              devWarn('Voice', 'Failed to call start() on Android SpeechRecognition', err);
            }
          };

          startAndroidSpeech();
          return;
        }

        // Ensure browser mediaDevices support (requires HTTPS secure context on mobile browsers)
        if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Microphone access is not supported or requires a secure context (HTTPS). " +
            "Please ensure you are accessing this site via HTTPS or localhost."
          );
        }

        // Get user media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        // Try MP4 format first (better OpenAI compatibility), fallback to WebM
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

        // Start speech recognition for interim results
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognitionAPI) {
          const speechRecognition = new SpeechRecognitionAPI();
          speechRecognition.continuous = true;
          speechRecognition.interimResults = true;
          speechRecognition.maxAlternatives = 1;

          // Set language, falling back to navigator.language or ar-EG
          speechRecognition.lang = langCode || (typeof navigator !== 'undefined' ? navigator.language : '') || "ar-EG";
          devLog('Voice', 'Speech recognition language set', { lang: speechRecognition.lang });

          speechRecognition.onstart = () => {
            devLog('Voice', 'Speech recognition started for interim results');
          };

          speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
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

            // Always update interim transcript for real-time display
            if (interim) {
              setInterimTranscript(interim);
              devLog('Voice', 'Speech interim result', { transcript: interim });
            }
            // Update with final results when available
            if (final) {
              setInterimTranscript(final);
              devLog('Voice', 'Speech final result', { transcript: final });
            }
          };

          speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            devWarn('Voice', 'Speech recognition error (interim)', { error: event.error });
            
            // Handle audio-capture (mic conflict) on Android by retrying shortly
            if (event.error === "audio-capture") {
              if (audioCaptureRetryCountRef.current < 3) {
                audioCaptureRetryCountRef.current += 1;
                devWarn('Voice', `Audio capture conflict, retry ${audioCaptureRetryCountRef.current}/3 in 800ms...`);
                setTimeout(() => {
                  if (isRecognitionActiveRef.current && speechRecognitionRef.current) {
                    try {
                      speechRecognitionRef.current.start();
                    } catch (e) {
                      devWarn('Voice', 'Failed to restart after audio-capture error', { error: String(e) });
                    }
                  }
                }, 800);
                return;
              } else {
                devWarn('Voice', 'Audio capture conflict persistent after 3 retries. Continuing in recording-only mode.');
                // Show a non-destructive warning toast once
                if (!speechRecognitionFailed) {
                  toast({
                    title: language === "ar" ? "معاينة النص غير متاحة" : "Text preview unavailable",
                    description: language === "ar" 
                      ? "نحن نسجل صوتك الآن، وسيتم تحويله إلى نص فور التوقف." 
                      : "We are recording your voice, text will be processed when you stop.",
                  });
                }
                setSpeechRecognitionFailed(true);
                return;
              }
            }

            // Only show error for critical errors, not network issues or aborted ones
            if (event.error !== "network" && event.error !== "no-speech" && event.error !== "aborted") {
              devWarn('Voice', 'Speech recognition critical error, fallback to recording-only', { error: event.error });
              if (!speechRecognitionFailed) {
                toast({
                  title: language === "ar" ? "معاينة النص غير متاحة" : "Text preview unavailable",
                  description: language === "ar" 
                    ? "نحن نسجل صوتك الآن، وسيتم تحويله إلى نص فور التوقف." 
                    : "We are recording your voice, text will be processed when you stop.",
                });
              }
            }
            // Mark as failed but don't stop recording
            setSpeechRecognitionFailed(true);
            // Don't stop recording - let audio recording continue for OpenAI
          };

          speechRecognition.onend = () => {
            devLog('Voice', 'Speech recognition ended');
            // Auto restart loop for Android continuous limitations and silence timeouts
            if (isRecognitionActiveRef.current && speechRecognitionRef.current) {
              try {
                speechRecognitionRef.current.start();
                devLog('Voice', 'Speech recognition restarted successfully in onend');
              } catch (e) {
                devWarn('Voice', 'Could not restart speech recognition in onend', { error: String(e) });
              }
            }
          };

          speechRecognitionRef.current = speechRecognition;
          speechRecognition.start();
        }

        mediaRecorder.onstart = () => {
          devLog('Voice', 'Audio recording started');
          setIsListening(true);
        };

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          devLog('Voice', 'Audio recording stopped');
          setIsListening(false);
          setIsProcessing(true);
          setInterimTranscript(""); // Clear interim transcript

          // Stop speech recognition
          isRecognitionActiveRef.current = false;

          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.stop();
            } catch (e) {
              devWarn('Voice', 'Error stopping speech recognition on mediaRecorder stop', { error: String(e) });
            }
            speechRecognitionRef.current = null;
          }

          try {
            const audioBlob = new Blob(audioChunksRef.current, {
              // نقرأ الـ mimeType من الـ mediaRecorder مباشرة (متاح في الـ closure)
              type: mediaRecorder.mimeType || "audio/webm",
            });
            devLog('Voice', 'Sending audio to server', {
              mimeType: audioBlob.type,
              size: audioBlob.size,
            });

            if (audioBlob.size === 0) {
              throw new Error('No audio data recorded. Please try again.');
            }

            // Create form data to send to your server
            const formData = new FormData();

            // Use appropriate file extension based on MIME type
            const fileExtension = audioBlob.type.includes("mp4")
              ? "m4a"
              : "webm";
            formData.append("audio", audioBlob, `recording.${fileExtension}`);

            // Include userId in the request payload when available
            if (user?.id) {
              formData.append("userId", user.id);
            }

            const headers: Record<string, string> = {}
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

            const response = await fetchWithDiagnostics(
              'Voice',
              'POST /analyze-voice',
              `${import.meta.env.VITE_BACKEND_API}/analyze-voice`,
              {
                method: "POST",
                headers,
                body: formData,
              },
              { timeoutMs: 60000, context: { mimeType: audioBlob.type, size: audioBlob.size } },
            );

            if (!response.ok) {
              const responseText = await readResponseText(response);
              throw new Error(responseText || `Server error: ${response.status}`);
            }

            const result = await response.json();
            devLog('Voice', 'Voice analysis response received', {
              hasTranscript: Boolean(result.transcript || result.text),
              hasEvent: Boolean(result.event),
            });
            if (result.event) {
              setEventData(result.event);
            }
            // Use the transcript from your server
            const transcription = result.transcript || result.text || "";
            setTranscript(transcription);

            // Update totalUsage directly from the API response
            if (typeof result.total_usage === "number") {
              devLog('Voice', 'analyze-voice total_usage received', { total_usage: result.total_usage });
              setTotalUsage(result.total_usage);
            }
          } catch (transcriptionError) {
            devError('Voice', 'Transcription failed', transcriptionError);
            const message = getFriendlyErrorMessage(
              transcriptionError,
              "Failed to transcribe audio",
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

        mediaRecorder.onerror = (event: Event) => {
          devError('Voice', 'MediaRecorder error', event);
          const message = "Audio recording failed. Please try again.";
          setError(message);
          toast({
            title: "Recording failed",
            description: message,
            variant: "destructive",
          });
          setIsListening(false);
          setIsProcessing(false);

          // Stop speech recognition
          isRecognitionActiveRef.current = false;
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.stop();
            } catch (e) {
              devWarn('Voice', 'Error stopping speech recognition on mediaRecorder error', { error: String(e) });
            }
            speechRecognitionRef.current = null;
          }
        };

        mediaRecorder.start(1000); // Collect data every second
        devLog('Voice', 'MediaRecorder start() called');
      } catch (err) {
        devError('Voice', 'Error starting voice input', err);
        const message = getFriendlyErrorMessage(err, "Failed to start voice input");
        setError(message);
        toast({
          title: "Couldn't start voice input",
          description: message,
          variant: "destructive",
        });
        setIsListening(false);
        setIsProcessing(false);

        // Stop speech recognition if it started
        isRecognitionActiveRef.current = false;
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {
            devWarn('Voice', 'Error stopping speech recognition on start catch block', { error: String(e) });
          }
          speechRecognitionRef.current = null;
        }
      }
    },
    [isSupported, toast],
  );

  const stopListening = useCallback(async () => {
    devLog('Voice', 'Stopping voice input');
    // نقرأ القرار المخزّن عند البداية — ضمان نفس المسار بالضبط
    const isAndroidPlatform = isAndroidModeRef.current;

    // Prevent any further auto restart loops
    isRecognitionActiveRef.current = false;

    // Stop audio recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      // نحفظ الـ ref محلياً قبل ما يتمسح — onstop محتاجه يقرأ الـ mimeType
      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      recorder.stop(); // ← onstop هيشتغل بعدها وعنده الـ mimeType من المتغير المحلي
    }

    // Stop speech recognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        devWarn('Voice', 'Error stopping speech recognition in stopListening', { error: String(e) });
      }
      speechRecognitionRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript("");
    setSpeechRecognitionFailed(false);

    if (isAndroidPlatform) {
      // flush الجلسة الأخيرة قبل الإرسال (في حال onend لم يشتغل بعد أو لم يكن هناك شيء)
      // sessionCommittedRef يمنع الإضافة المزدوجة لو onend سبق stopListening
      if (sessionFinalRef.current && !sessionCommittedRef.current) {
        accumulatedTranscriptRef.current = accumulatedTranscriptRef.current
          ? accumulatedTranscriptRef.current + " " + sessionFinalRef.current
          : sessionFinalRef.current;
        sessionCommittedRef.current = true;
        sessionFinalRef.current = "";
      }

      const finalResult = accumulatedTranscriptRef.current.trim();
      console.log("\n=== ANDROID SPEECH RECOGNITION FINAL RESULT ===\n");
      console.log(finalResult);
      console.log("\n===============================================\n");
      
      // Save to localStorage under key "testVoice"
      localStorage.setItem("testVoice", finalResult);

      // Trigger downloading testVoice.txt automatically
      try {
        const blob = new Blob([finalResult], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "testVoice.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to download testVoice.txt", err);
      }

      if (!finalResult) return;

      setIsProcessing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("text", finalResult);
        if (user?.id) {
          formData.append("userId", user.id);
        }

        const headers: Record<string, string> = {};
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const response = await fetchWithDiagnostics(
          'Voice',
          'POST /analyze-voice',
          `${import.meta.env.VITE_BACKEND_API}/analyze-voice`,
          {
            method: "POST",
            headers,
            body: formData,
          },
          { timeoutMs: 60000, context: { textLength: finalResult.length } },
        );

        if (!response.ok) {
          const responseText = await readResponseText(response);
          throw new Error(responseText || `Server error: ${response.status}`);
        }

        const result = await response.json();
        devLog('Voice', 'Android Voice analysis response received', {
          hasTranscript: Boolean(result.transcript || result.text),
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
      } catch (transcriptionError) {
        devError('Voice', 'Android text submission failed', transcriptionError);
        const message = getFriendlyErrorMessage(
          transcriptionError,
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
    }
  }, [user, session, setTotalUsage, toast]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
    isProcessing,
    speechRecognitionFailed,
    eventData,
  };
}
export type { ParsedEvent };
