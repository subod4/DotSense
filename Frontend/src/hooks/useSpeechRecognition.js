/**
 * Simple Speech Recognition Hook
 */

import { useState, useEffect, useRef } from 'react'
import speechService from '../services/SpeechService'

export default function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [noSpeechMessage, setNoSpeechMessage] = useState(null)
  const onResultRef = useRef(null)

  useEffect(() => {
    speechService.onStart = () => {
      setIsListening(true)
      setError(null)
      setTranscript('')
      setNoSpeechMessage(null)
    }

    speechService.onEnd = () => {
      setIsListening(false)
    }

    speechService.onResult = (text) => {
      setTranscript(text)
      setNoSpeechMessage(null)
      onResultRef.current?.(text)
    }

    speechService.onError = (err) => {
      setError(err)
    }

    speechService.onNoSpeech = (msg) => {
      setNoSpeechMessage(msg)
    }

    return () => speechService.abort()
  }, [])

  const start = async () => {
    setError(null)
    setNoSpeechMessage(null)
    await speechService.start()
  }

  const stop = () => speechService.stop()

  const toggle = async () => {
    if (isListening) stop()
    else await start()
  }

  return {
    isListening,
    transcript,
    error,
    noSpeechMessage,
    start,
    stop,
    toggle,
    setOnResult: (cb) => { onResultRef.current = cb },
    clearError: () => setError(null),
    clearNoSpeechMessage: () => setNoSpeechMessage(null)
  }
}

