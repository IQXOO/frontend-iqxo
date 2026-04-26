/// <reference types="vite/client" />

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
})

export interface VoiceTranscriptionOptions {
  language?: string
  prompt?: string
  temperature?: number
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: VoiceTranscriptionOptions = {}
): Promise<string> {
  try {
    const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type })
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: options.language || 'en',
      prompt: options.prompt || 'This is a voice recording for creating a calendar event. The user will speak about meetings, appointments, tasks, or reminders. Common phrases include "meeting with", "appointment at", "call with", "deadline for", "remind me to", "schedule", "book", "reserve". Transcribe accurately for event creation.',
      temperature: options.temperature || 0.1,
      response_format: 'text'
    })

    return transcription
  } catch (error) {
    console.error('OpenAI transcription error:', error)
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to transcribe audio with OpenAI'
    )
  }
}

export async function parseEventFromText(text: string): Promise<{
  title: string
  notes?: string
  date?: string
  time?: string
  phone?: string
  location?: string
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an event parsing assistant. Extract event details from the user's speech and return a JSON object with the following structure:
{
  "title": "Brief event title (required)",
  "notes": "Additional details or description (optional)",
  "date": "Date in YYYY-MM-DD format (optional, use today if not specified)",
  "time": "Time in HH:MM format (optional)",
  "phone": "Phone number if mentioned (optional)",
  "location": "Location if mentioned (optional)"
}

Rules:
- Title is required and should be concise
- If no date is mentioned, assume today
- If no time is mentioned, leave it empty
- Extract phone numbers and locations if clearly mentioned
- Keep the title under 50 characters
- Notes can include additional context or details
- Return ONLY valid JSON, no explanations`
        },
        {
          role: 'user',
          content: `Parse this event request: "${text}"`
        }
      ],
      temperature: 0.2,
      max_tokens: 200
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    try {
      // Remove markdown code blocks if present
      let cleanContent = content
      if (content.includes('```')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/```\s*$/, '')
      }
      
      const parsed = JSON.parse(cleanContent)
      return {
        title: parsed.title || 'New Event',
        notes: parsed.notes,
        date: parsed.date,
        time: parsed.time,
        phone: parsed.phone,
        location: parsed.location
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      // Fallback to simple title extraction
      return {
        title: text.trim().substring(0, 50) || 'New Event',
        notes: text
      }
    }
  } catch (error) {
    console.error('Event parsing error:', error)
    // Fallback to basic extraction
    return {
      title: text.trim().substring(0, 50) || 'New Event',
      notes: text
    }
  }
}

export async function analyzeEventFromImage(imageBase64: string, imageType: string): Promise<{
  title: string
  notes?: string
  date?: string
  time?: string
  phone?: string
  location?: string
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert event extraction assistant. Analyze the provided image and extract event details. Return a JSON object with the following structure:
{
  "title": "Brief event title (required)",
  "notes": "Additional details or description (optional)",
  "date": "Date in YYYY-MM-DD format (optional, use today if not specified)",
  "time": "Time in HH:MM format (optional)",
  "phone": "Phone number if visible (optional)",
  "location": "Location if visible (optional)"
}

Rules:
- Look for text, dates, times, locations, phone numbers in the image
- If no date is visible, assume today's date
- If no time is visible, leave it empty
- Extract phone numbers and locations if clearly visible
- Handle common date formats: MM/DD/YYYY, DD/MM/YYYY, "Jan 15", etc.
- Handle time formats: "3 PM", "15:00", "2:30 PM", etc.
- Notes should describe what you see in the image relevant to the event
- Return ONLY valid JSON, no explanations or extra text`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract event details from this image:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 300
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    try {
      // Remove markdown code blocks if present
      let cleanContent = content
      if (content.includes('```')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/```\s*$/, '')
      }
      
      const parsed = JSON.parse(cleanContent)
      return {
        title: parsed.title || 'Event from Photo',
        notes: parsed.notes,
        date: parsed.date,
        time: parsed.time,
        phone: parsed.phone,
        location: parsed.location
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      // Fallback to basic event
      return {
        title: 'Event from Photo',
        notes: 'Event extracted from image'
      }
    }
  } catch (error) {
    console.error('Image analysis error:', error)
    // Fallback to basic event
    return {
      title: 'Event from Photo',
      notes: 'Event extracted from image'
    }
  }
}

export function isAudioSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && 
         !!navigator.mediaDevices && 
         !!navigator.mediaDevices.getUserMedia
}

export async function startAudioRecording(): Promise<MediaRecorder> {
  if (!isAudioSupported()) {
    throw new Error('Audio recording is not supported in this browser')
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    
    return mediaRecorder
  } catch (error) {
    console.error('Error accessing microphone:', error)
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to access microphone'
    )
  }
}

export function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/wav'
  ]
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  
  return 'audio/webm' // fallback
}
