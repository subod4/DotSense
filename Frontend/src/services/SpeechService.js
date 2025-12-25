/**
 * Simple Google Cloud Speech-to-Text Service
 * Uses MediaRecorder to capture WEBM_OPUS audio and sends it to Google STT API.
 */

const GOOGLE_CLOUD_STT_API = 'https://speech.googleapis.com/v1/speech:recognize'

class SpeechService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || ''
    this.isListening = false
    this.mediaRecorder = null
    this.audioChunks = []
    
    // Callbacks
    this.onResult = null
    this.onError = null
    this.onStart = null
    this.onEnd = null
    this.onNoSpeech = null
  }

  async start() {
    if (this.isListening) return
    if (!this.apiKey) {
      this.onError?.('API key not configured')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000
        } 
      })

      // Use MediaRecorder for better compression and handling
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio chunk captured:', event.data.size, 'bytes')
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        await this._processAudio()
        this._cleanup()
        this.isListening = false
        this.onEnd?.()
      }

      this.mediaRecorder.start()
      this.isListening = true
      this.onStart?.()

      // Auto-stop after 5 seconds to prevent huge payloads
      setTimeout(() => {
        if (this.isListening) this.stop()
      }, 5000)

    } catch (err) {
      console.error('Mic Error:', err)
      this.onError?.('Microphone access denied or not supported')
      this.isListening = false
    }
  }

  stop() {
    if (!this.isListening || !this.mediaRecorder) return
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
  }

  async _processAudio() {
    if (this.audioChunks.length === 0) {
      this.onError?.('No audio recorded')
      return
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' })
      console.log('Processing audio blob:', audioBlob.size, 'bytes')
      
      const reader = new FileReader()
      
      reader.readAsDataURL(audioBlob)
      
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]

        try {
          // Note: For WEBM_OPUS, sampleRateHertz is optional/ignored as it's in the header.
          const response = await fetch(`${GOOGLE_CLOUD_STT_API}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              config: {
                encoding: 'WEBM_OPUS',
                languageCode: 'en-US',
                // Using default model for broader compatibility
              },
              audio: {
                content: base64Audio
              }
            })
          })

          const data = await response.json()
          console.log('Google STT Response:', JSON.stringify(data, null, 2))

          if (!response.ok) {
            console.error('Google STT API Error:', data)
            throw new Error(data.error?.message || 'API request failed')
          }

          const transcript = data.results
            ?.map(result => result.alternatives[0].transcript)
            .join('\n')
            .trim()

          if (transcript) {
            this.onResult?.(transcript)
          } else {
            // No speech detected - notify the UI
            console.log('No transcript returned from API')
            this.onNoSpeech?.('I couldn\'t hear you. Please try again.')
          }

        } catch (apiErr) {
          console.error('API Call Error:', apiErr)
          this.onError?.('Failed to recognize speech')
        }
      }

    } catch (err) {
      console.error('Processing Error:', err)
      this.onError?.('Error processing audio')
    }
  }

  _cleanup() {
    if (this.mediaRecorder) {
      const stream = this.mediaRecorder.stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
    this.mediaRecorder = null
    this.audioChunks = []
  }

  abort() {
    this.stop()
    this._cleanup()
  }
}

export default new SpeechService()
