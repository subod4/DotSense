// src/hooks/useVoiceRecognition.js
import { useState, useCallback, useRef, useEffect } from 'react';

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(currentInterim);
      }
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error", event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error !== 'aborted') {
        setError(event.error);
      }

      if (event.error !== 'no-speech') {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Audio feedback cues
  const playAudioCue = useCallback((type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'start') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      // Ignore audio errors silently
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    if (isListeningRef.current) {
      return;
    }

    playAudioCue('start');
    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition start failed:', err);
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      } catch (e) {
        setError('Failed to start speech recognition');
      }
    }
  }, [playAudioCue]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      isListeningRef.current = false;
      playAudioCue('stop');
    }
  }, [playAudioCue]);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      isListeningRef.current = false;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    isSupported,
  };
}
