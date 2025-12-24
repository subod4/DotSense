// src/hooks/useTextToSpeech.js
import { useState, useCallback, useEffect, useRef } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!synth.current) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel current speech
    synth.current.cancel();

    // Small delay to ensure cancellation takes effect
    setTimeout(() => {
      if (!synth.current) return;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = (e) => {
        console.error("TTS Error", e);
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      synth.current.speak(utterance);
    }, 50);
  }, []);

  const cancel = useCallback(() => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { speak, cancel, isSpeaking };
}
