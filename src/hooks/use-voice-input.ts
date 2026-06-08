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
  const { user, session, setTotalUsage } = useApp();
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

      try {
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

          if (langCode) {
            speechRecognition.lang = langCode;
            devLog('Voice', 'Speech recognition language set', { langCode });
          }

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
            // Only show error for critical errors, not network issues
            if (event.error !== "network" && event.error !== "no-speech") {
              devError('Voice', 'Speech recognition critical error', event.error);
              toast({
                title: "Voice transcription interrupted",
                description: "The microphone or speech recognition stopped early. Please try again.",
                variant: "destructive",
              });
            }
            // Mark as failed but don't stop recording
            setSpeechRecognitionFailed(true);
            // Don't stop recording - let audio recording continue for OpenAI
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

          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
            speechRecognitionRef.current = null;
          }

          try {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: mediaRecorderRef.current?.mimeType || "audio/webm",
            });
            devLog('Voice', 'Sending audio to server', {
              mimeType: audioBlob.type,
              size: audioBlob.size,
            });

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
          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
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
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }
      }
    },
    [isSupported, toast],
  );

  const stopListening = useCallback(() => {
    devLog('Voice', 'Stopping voice input');

    // Stop audio recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
    }

    // Stop speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript("");
    setSpeechRecognitionFailed(false);
  }, []);

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
