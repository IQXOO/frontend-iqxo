"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  transcribeAudio,
  startAudioRecording,
  isAudioSupported,
  getSupportedMimeType,
} from "../lib/openai-voice";
import { ParsedEvent } from "../lib/parse-voice-input";

// Type declarations for Web Speech API (for interim results)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
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
  const convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
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

    console.log("[v0] Audio recording support:", audioSupported);
    console.log("[v0] Speech recognition support:", speechSupported);
    setIsSupported(supported);

    if (!supported) {
      console.error("[v0] Voice input is not supported in this browser");
    }
  }, []);

  const startListening = useCallback(
    async (langCode?: string) => {
      console.log("[v0] Starting voice input...");

      if (!isSupported) {
        const errorMsg = "Voice input is not supported in this browser";
        setError(errorMsg);
        console.error("[v0]", errorMsg);
        return;
      }

      setError(null);
      setTranscript("");
      setInterimTranscript("");
      setEventData(null); // reset previous result so it never bleeds into next analysis
      setSpeechRecognitionFailed(false);
      audioChunksRef.current = [];

      try {
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
            console.log("[v0] Speech recognition language set to:", langCode);
          }

          speechRecognition.onstart = () => {
            console.log("[v0] Speech recognition started for interim results");
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
              console.log("[v0] Speech interim:", interim);
            }
            // Update with final results when available
            if (final) {
              setInterimTranscript(final);
              console.log("[v0] Speech final:", final);
            }
          };

          speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.warn(
              "[v0] Speech recognition error (interim):",
              event.error,
            );
            // Only show error for critical errors, not network issues
            if (event.error !== "network" && event.error !== "no-speech") {
              console.error(
                "[v0] Speech recognition critical error:",
                event.error,
              );
            }
            // Mark as failed but don't stop recording
            setSpeechRecognitionFailed(true);
            // Don't stop recording - let audio recording continue for OpenAI
          };

          speechRecognitionRef.current = speechRecognition;
          speechRecognition.start();
        }

        mediaRecorder.onstart = () => {
          console.log("[v0] Audio recording started");
          setIsListening(true);
        };

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log("[v0] Audio recording stopped");
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
            console.log("[v0] Sending audio to server:", {
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

            const response = await fetch(
              `${import.meta.env.VITE_BACKEND_API}/analyze-voice`,
              {
                method: "POST",
                body: formData,
              },
            );

            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log("[v0] Server response:", result);
            if (result.event) {
              setEventData(result.event);
            }
            // Use the transcript from your server
            const transcription = result.transcript || result.text || "";
            setTranscript(transcription);
          } catch (transcriptionError) {
            console.error("[v0] Transcription error:", transcriptionError);
            setError(
              transcriptionError instanceof Error
                ? transcriptionError.message
                : "Failed to transcribe audio",
            );
          } finally {
            setIsProcessing(false);
          }
        };

        mediaRecorder.onerror = (event: Event) => {
          console.error("[v0] MediaRecorder error:", event);
          setError("Audio recording failed");
          setIsListening(false);
          setIsProcessing(false);

          // Stop speech recognition
          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
            speechRecognitionRef.current = null;
          }
        };

        mediaRecorder.start(1000); // Collect data every second
        console.log("[v0] MediaRecorder start() called");
      } catch (err) {
        console.error("[v0] Error starting voice input:", err);
        setError(
          err instanceof Error ? err.message : "Failed to start voice input",
        );
        setIsListening(false);
        setIsProcessing(false);

        // Stop speech recognition if it started
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }
      }
    },
    [isSupported],
  );

  const stopListening = useCallback(() => {
    console.log("[v0] Stopping voice input...");

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
