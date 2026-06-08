/// <reference types="vite/client" />

/**
 * Security note:
 * This module used to call OpenAI directly from the browser which exposed an
 * OpenAI API key in client bundles. That behavior
 * has been removed. All OpenAI calls are now proxied through a trusted
 * backend (configured via `VITE_BACKEND_API`). The frontend will never
 * instantiate an OpenAI client or hold secrets.
 */

import { supabase } from './supabase'
import { devLog, devWarn, fetchWithDiagnostics, readResponseText } from './logger'

/** Helper: include auth token when available */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) return { Authorization: `Bearer ${token}` }
  } catch {
    devWarn('Voice', 'Could not read auth session for request header')
  }
  return {}
}

export interface VoiceTranscriptionOptions {
  language?: string
  prompt?: string
  temperature?: number
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: VoiceTranscriptionOptions = {}
): Promise<string> {
  // Proxy the audio to the backend; backend should call OpenAI securely.
  devLog('Voice', 'Transcription request prepared', {
    mimeType: audioBlob.type,
    size: audioBlob.size,
    language: options.language,
  })
  const form = new FormData()
  form.append('file', audioBlob, 'audio.webm')
  if (options.language) form.append('language', options.language)
  if (options.prompt) form.append('prompt', options.prompt)

  const headers = await getAuthHeader()

  const res = await fetchWithDiagnostics(
    'Voice',
    'POST /analyze-voice',
    `${import.meta.env.VITE_BACKEND_API}/analyze-voice`,
    {
      method: 'POST',
      headers,
      body: form,
    },
    { timeoutMs: 60000 },
  )

  if (!res.ok) {
    const text = await readResponseText(res)
    throw new Error(text || `Transcription failed with ${res.status}`)
  }

  const data = await res.json()
  devLog('Voice', 'Transcription response received', {
    hasTranscript: Boolean(data.transcript || data.text),
    hasEvent: Boolean(data.event),
  })
  // Expecting { transcript: string, event?: {...} }
  return data.transcript || data.text || ''
}

/**
 * TODO: Text-to-event parsing via backend
 * 
 * This function is currently dead code (never called by frontend).
 * It was designed to parse user-spoken text into structured event data
 * using OpenAI GPT-3.5-turbo.
 * 
 * To implement:
 * 1. Backend must create POST /parse-text endpoint
 * 2. Endpoint should accept { text: string, userId: string }
 * 3. Validate Authorization header (Supabase JWT)
 * 4. Call OpenAI gpt-3.5-turbo with event parsing prompt
 * 5. Return { title, date?, time?, phone?, location?, notes? }
 * 
 * Backend Contract:
 * - Method: POST
 * - Endpoint: POST /parse-text
 * - Headers: { Authorization: Bearer <JWT> }
 * - Body: { text: string }
 * - Response: { title: string, date?: string, time?: string, ... }
 * 
 * Security:
 * - Backend MUST validate Authorization header
 * - Backend MUST NOT trust client-sent userId
 * - Frontend will attach Authorization header when available
 */
export async function parseEventFromText(_text: string) {
  devWarn('Voice', 'parseEventFromText called but POST /parse-text is not implemented')
  // PLACEHOLDER: Backend endpoint not yet implemented
  // Throwing error to prevent silent failures if this code path is activated
  throw new Error(
    'parseEventFromText: Backend endpoint POST /parse-text is not yet implemented. ' +
    'This function is currently dead code and should not be called.'
  )
}

export async function analyzeEventFromImage(imageBase64: string, imageType: string) {
  // Proxy image analysis to backend — backend calls OpenAI/CV safely.
  devLog('Upload', 'Image analysis request prepared', {
    imageType,
    imageBytes: Math.floor((imageBase64.length * 3) / 4),
  })
  const byteString = atob(imageBase64)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  const blob = new Blob([ab], { type: imageType })

  const form = new FormData()
  form.append('image', blob, 'upload')

  const headers = await getAuthHeader()

  const res = await fetchWithDiagnostics(
    'Upload',
    'POST /analyze-image',
    `${import.meta.env.VITE_BACKEND_API}/analyze-image`,
    {
      method: 'POST',
      headers,
      body: form,
    },
    { timeoutMs: 60000 },
  )

  if (!res.ok) {
    const txt = await readResponseText(res)
    throw new Error(txt || `Image analysis failed ${res.status}`)
  }

  const data = await res.json()
  devLog('Upload', 'Image analysis response received', {
    hasEvent: Boolean(data.event),
  })
  return data.event ?? data
}

export function isAudioSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia
}

export async function startAudioRecording(): Promise<MediaRecorder> {
  if (!isAudioSupported()) throw new Error('Audio recording is not supported in this browser')

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })

  return new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
}

export function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/wav']
  for (const type of types) if (MediaRecorder.isTypeSupported(type)) return type
  return 'audio/webm'
}
