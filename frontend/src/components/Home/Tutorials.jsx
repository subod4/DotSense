import { useState, useEffect, useRef } from 'react';
import { api } from '../api/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useVoiceRecognition } from '../../hooks/UserVoice.Recognition.jsx';
import { useTextToSpeech } from '../../hooks/UseText.Speech.jsx';
import { BrailleDisplay } from './BrailleDisplay.jsx';
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  CheckCircle,
  Loader,
  Home,
  Mic,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { ALPHABET } from '../../utils/Braille.jsx';
import { extractLetter, getSpeechErrorMessage } from '../../utils/Speech.Helper.jsx';

export function TutorialMode({ onExit }) {
  const { user } = useAuth();
  const {
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    isSupported,
    resetTranscript,
  } = useVoiceRecognition();

  const { speak, cancel: cancelSpeech } = useTextToSpeech();
  const [sessionId, setSessionId] = useState(null);
  const [currentLetter, setCurrentLetter] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState(null);
  const [attempts, setAttempts] = useState({});

  const previousTranscriptRef = useRef('');

  useEffect(() => {
    const initTutorial = async () => {
      if (!user) return;

      try {
        const { session_id } = await api.startTutorial(user.user_id);
        setSessionId(session_id);
        await loadCurrentStep(session_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start tutorial');
      } finally {
        setLoading(false);
      }
    };

    initTutorial();
  }, [user]);

  // Handle Speech Recognition Results
  useEffect(() => {
    if (transcript && transcript !== previousTranscriptRef.current && practiceMode) {
      previousTranscriptRef.current = transcript;
      handlePractice(transcript);
    }
  }, [transcript, practiceMode]);

  // Reset state when switching letters
  useEffect(() => {
    setPracticeMode(false);
    setPracticeFeedback(null);
    stopListening();
    cancelSpeech();
    resetTranscript();

    // Auto speak when loading new letter
    if (currentLetter) {
      setTimeout(() => {
        speak(currentLetter.voice_prompt || `The letter ${currentLetter.letter}`);
      }, 500);
    }
  }, [currentIndex, currentLetter]);

  const loadCurrentStep = async (tutorialId) => {
    setLoading(true);
    setError('');
    try {
      const step = await api.getCurrentTutorialStep(tutorialId);
      setCurrentLetter({
        letter: step.letter,
        dots: step.dots,
        description: step.description,
        voice_prompt: step.voice_prompt,
        tutorial_id: step.tutorial_id,
      });
      const idx = ALPHABET.indexOf(step.letter.toLowerCase());
      if (idx !== -1) setCurrentIndex(idx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load letter');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!sessionId) return;

    if (currentIndex < ALPHABET.length - 1) {
      setLoading(true);
      try {
        const step = await api.nextTutorialLetter(sessionId);
        setCurrentLetter({
          letter: step.letter,
          dots: step.dots,
          description: step.description,
          voice_prompt: step.voice_prompt,
          tutorial_id: step.tutorial_id,
        });
        setCurrentIndex(currentIndex + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to go to next letter');
      } finally {
        setLoading(false);
      }
    } else {
      await api.completeTutorial(sessionId);
      setCompleted(true);
    }
  };

  const handlePrevious = async () => {
    if (!sessionId || currentIndex === 0) return;

    setLoading(true);
    try {
      const step = await api.previousTutorialLetter(sessionId);
      setCurrentLetter({
        letter: step.letter,
        dots: step.dots,
        description: step.description,
        voice_prompt: step.voice_prompt,
        tutorial_id: step.tutorial_id,
      });
      setCurrentIndex(currentIndex - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go to previous letter');
    } finally {
      setLoading(false);
    }
  };

  const handlePractice = (originalTranscript) => {
    if (!currentLetter) return;

    const command = originalTranscript.toLowerCase().trim().replace(/[.,!?]$/, '');

    // Voice Commands for Navigation
    if (['next', 'next letter', 'continue', 'skip'].includes(command)) {
      speak('Moving to next letter');
      handleNext();
      return;
    }

    if (['previous', 'back', 'go back'].includes(command)) {
      speak('Going back');
      handlePrevious();
      return;
    }

    if (['repeat', 'say again', 'what was that'].includes(command)) {
      speak(currentLetter.voice_prompt || `The letter ${currentLetter.letter}`, () => {
        if (practiceMode) startListening();
      });
      return;
    }

    const spokenLetter = extractLetter(originalTranscript);

    // Handle unclear or multi-letter input
    if (spokenLetter.length > 1) {
      if (practiceMode) {
        setPracticeFeedback({
          isCorrect: false,
          message: "I didn't catch that. Please say the letter.",
        });
        setTimeout(() => startListening(), 1500);
      }

      setTimeout(() => {
        setPracticeFeedback(null);
      }, 4000);

      return;
    }

    const targetLetter = currentLetter.letter.toLowerCase();
    const isCorrect = spokenLetter === targetLetter;

    // Record attempt
    setAttempts((prev) => ({
      ...prev,
      [targetLetter]: (prev[targetLetter] || 0) + 1,
    }));

    if (isCorrect) {
      setPracticeFeedback({
        isCorrect: true,
        message: 'Correct! Great job!',
      });
      speak('Correct! Say Next to continue.', () => {
        if (practiceMode) {
          setTimeout(() => startListening(), 500);
        }
      });
    } else {
      setPracticeFeedback({
        isCorrect: false,
        message: `You said "${spokenLetter}". Try again!`,
      });
      speak(`Not quite. You said ${spokenLetter}, but this is ${targetLetter}. Try again.`, () => {
        if (practiceMode) startListening();
      });
    }

    const timeout = isCorrect ? 2000 : 4000;
    setTimeout(() => {
      setPracticeFeedback(null);
    }, timeout);
  };

  const togglePracticeMode = () => {
    if (!isSupported) {
      alert('Voice recognition is not supported in your browser.');
      return;
    }
    if (practiceMode) {
      setPracticeMode(false);
      stopListening();
      cancelSpeech();
      setPracticeFeedback(null);
    } else {
      setPracticeMode(true);
      speak(`Practice time. Say "Letter ${currentLetter?.letter}"`, () => {
        if (!isListening) {
          startListening();
        }
      });
    }
  };

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Tutorial Complete!</h2>
          <p className="text-xl text-gray-600 mb-8">
            Congratulations! You've learned all 26 letters of the Braille alphabet. You're now ready to
            practice with adaptive learning mode!
          </p>
          <button
            onClick={onExit}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all inline-flex items-center gap-2"
          >
            <Home size={24} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading && !currentLetter) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">{error}</div>
      </div>
    );
  }

  if (!currentLetter) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <Home size={20} />
          Exit Tutorial
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Progress:</span>
          <span className="font-semibold text-blue-600">
            {currentIndex + 1} / {ALPHABET.length}
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          className={`bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-2 transition-all duration-300 ${
            practiceMode ? 'scale-[1.02]' : ''
          }`}
        >
          <div className="bg-white rounded-xl p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-between w-full max-w-lg">
                <div className="flex items-center gap-4">
                  <h2 className="text-5xl font-bold text-gray-900">Letter: {currentLetter.letter.toUpperCase()}</h2>
                  <button
                    onClick={() => speak(`The letter ${currentLetter.letter}`)}
                    className="p-3 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                    aria-label="Speak letter"
                  >
                    <Volume2 className="text-blue-600" size={24} />
                  </button>
                </div>

                {attempts[currentLetter.letter] > 0 && (
                  <div className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                    Attempts: {attempts[currentLetter.letter]}
                  </div>
                )}
              </div>

              <BrailleDisplay dots={currentLetter.dots} size="lg" />

              {!practiceMode ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 w-full">
                    <div className="flex items-start gap-3">
                      <Volume2 className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          {currentLetter.voice_prompt || `This is the letter ${currentLetter.letter}`}
                        </p>
                        <button
                          onClick={() => speak(currentLetter.voice_prompt || `The letter ${currentLetter.letter}`)}
                          className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Play Audio
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 w-full">
                    <p className="text-gray-700 text-center">
                      {currentLetter.description || `Braille pattern for the letter ${currentLetter.letter}`}
                    </p>
                  </div>

                  <button
                    onClick={togglePracticeMode}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                  >
                    <Mic size={20} />
                    Practice Speaking
                  </button>
                </>
              ) : (
                <div className="w-full max-w-lg animate-in fade-in zoom-in duration-300">
                  <div className="text-center space-y-6">
                    <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-6 relative overflow-hidden">
                      <div className="flex flex-col items-center gap-4 relative z-10">
                        <button
                          onClick={isListening ? stopListening : startListening}
                          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                            isListening
                              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <Mic size={32} />
                        </button>

                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {isListening ? interimTranscript || 'Listening...' : 'Tap to Speak'}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {isListening ? 'Listening for letter or commands...' : `Say "${currentLetter.letter}", "Next", or "Back"`}
                          </p>
                        </div>
                      </div>

                      {/* Ripple effect background when listening */}
                      {isListening && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-200/50 rounded-full animate-ping -z-0" />
                      )}
                    </div>

                    {voiceError && (
                      <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-left">
                        <AlertCircle className="flex-shrink-0" size={20} />
                        <div className="text-sm">{getSpeechErrorMessage(voiceError)}</div>
                      </div>
                    )}

                    {practiceFeedback && (
                      <div
                        className={`p-4 rounded-xl flex items-center justify-center gap-3 animate-in slide-in-from-bottom-2 ${
                          practiceFeedback.isCorrect
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}
                      >
                        {practiceFeedback.isCorrect ? (
                          <CheckCircle size={24} />
                        ) : (
                          <XCircle size={24} />
                        )}
                        <span className="font-semibold text-lg">{practiceFeedback.message}</span>
                      </div>
                    )}

                    <button
                      onClick={togglePracticeMode}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium underline"
                    >
                      Stop Practicing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0 || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-4 px-6 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-200"
        >
          <ChevronLeft size={24} />
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentIndex === ALPHABET.length - 1 ? (
            <>
              <CheckCircle size={24} />
              Complete Tutorial
            </>
          ) : (
            <>
              Next
              <ChevronRight size={24} />
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex gap-2 flex-wrap justify-center">
          {ALPHABET.map((letter, idx) => (
            <div
              key={letter}
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold transition-all ${
                idx === currentIndex
                  ? 'bg-blue-600 text-white scale-110 shadow-lg'
                  : idx < currentIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}