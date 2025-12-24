import { useState, useEffect, useRef } from 'react';
import { api } from '../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceRecognition } from '../../hooks/UserVoice.Recognition.jsx';
import { useTextToSpeech } from '../../hooks/UseText.Speech.jsx';
import { BrailleDisplay } from './BrailleDisplay';
import { 
  Mic, Home, Zap, Trophy, Timer, Volume2, AlertCircle, PlayCircle, StopCircle, CheckCircle, Brain
} from 'lucide-react';
import { ALPHABET } from '../../utils/Braille';
import { extractLetter, getSpeechErrorMessage, getEncouragementMessage } from '../../utils/Speech.Helper';

export default function LearningMode({ onExit }) {
  const { user } = useAuth();
  const {
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    isSupported,
    resetTranscript
  } = useVoiceRecognition();

  const { speak, cancel: cancelSpeech, isSpeaking } = useTextToSpeech();

  const [currentExercise, setCurrentExercise] = useState(null);
  const [dots, setDots] = useState([0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [assistantMode, setAssistantMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [apiError, setApiError] = useState(null);

  const lastTranscriptRef = useRef('');

  /* ---------------- Lifecycle ---------------- */

  useEffect(() => {
    if (user) {
      startSession();
    }
    return () => {
      cancelSpeech();
      if (sessionId) endSession();
    };
  }, [user]);

  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      handleAttempt(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && !isListening && !loading && !showCelebration) {
        e.preventDefault();
        startListening();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isListening, loading, showCelebration]);

  /* ---------------- Session Management ---------------- */

  const startSession = async () => {
    if (!user) return;
    try {
      const response = await api.startSession(user.user_id, 'learning');
      setSessionId(response.session_id);
      loadNextLetter(); // Load first exercise after session starts
    } catch (err) {
      console.error('Failed to start session:', err);
      setApiError('Failed to start learning session');
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    try {
      await api.endSession(sessionId);
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  /* ---------------- Core Logic ---------------- */

  const loadNextLetter = async () => {
    if (!user) return;

    setLoading(true);
    setFeedback(null);
    setApiError(null);
    resetTranscript();
    setStartTime(Date.now());

    try {
      // POST /learning/step
      const learningRequest = {
        userid: user.user_id,
        availableletters: ALPHABET
      };
      
      const exerciseResponse = await api.getAdaptiveLetter(user.user_id, ALPHABET);
      
      // Use response directly (matches AdaptiveLearningResponse shape)
      setCurrentExercise(exerciseResponse);

      // GET /esp32/letter/{letter}
      const brailleResponse = await api.getBrailleDots(exerciseResponse.next_letter);
      setDots(brailleResponse.dots);

      // Speak instruction
      speak(
        exerciseResponse.reason || `Say the letter ${exerciseResponse.next_letter}`,
        assistantMode ? () => startListening() : undefined
      );
    } catch (err) {
      console.error('Error loading next letter:', err);
      setApiError('Failed to load exercise. Please try again.');
      speak('Sorry, having trouble loading the next exercise. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttempt = async (rawTranscript) => {
    if (!currentExercise || !user || !sessionId) return;

    const spokenLetter = extractLetter(rawTranscript);
    
    // Handle invalid input (not single letter)
    if (spokenLetter.length !== 1) {
      setFeedback({
        message: 'Please speak clearly',
        suggestion: `Say only the letter "${currentExercise.next_letter}"`,
        tone: 'neutral',
      });
      speak(
        `I heard "${rawTranscript}". Please say only the letter ${currentExercise.next_letter}.`,
        assistantMode ? () => startListening() : undefined
      );
      return;
    }

    const responseTime = (Date.now() - startTime) / 1000;
    setTotalAttempts(prev => prev + 1);

    try {
      // POST /learning/attempt
      const attemptRequest = {
        userid: user.user_id,
        targetletter: currentExercise.next_letter,
        spokenletter: spokenLetter,
        responsetime: responseTime,
        sessionid: sessionId
      };

      const result = await api.recordLearningAttempt(attemptRequest);

      setStreak(result.result.new_streak || 0);

      if (result.result.correct) {
        setCorrectAttempts(prev => prev + 1);
        const msg = getEncouragementMessage(true, result.result.new_streak || 0);

        setFeedback({ 
          message: 'Correct! 🎉', 
          suggestion: msg, 
          tone: 'celebration' 
        });
        setShowCelebration(true);

        speak(msg, () => {
          setTimeout(() => {
            setShowCelebration(false);
            if (!assistantMode) loadNextLetter();
          }, 2000);
        });
      } else {
        const msg = `You said ${spokenLetter}, but it was ${currentExercise.next_letter}. Try again!`;
        setFeedback({ 
          message: 'Try again', 
          suggestion: msg, 
          tone: 'neutral' 
        });

        speak(msg, assistantMode ? () => {
          setTimeout(() => startListening(), 500);
        } : undefined);
      }
    } catch (err) {
      console.error('Failed to record attempt:', err);
      setApiError('Failed to record your attempt. Please try again.');
      speak('Sorry, could not record your attempt. Please try speaking again.');
    } finally {
      lastTranscriptRef.current = '';
      resetTranscript();
    }
  };

  const toggleAssistantMode = () => {
    const nextMode = !assistantMode;
    setAssistantMode(nextMode);
    cancelSpeech();
    stopListening();

    speak(nextMode ? 'Assistant mode enabled. I will guide you through exercises.' : 'Assistant mode disabled.');

    if (nextMode && currentExercise) {
      setTimeout(() => {
        speak(currentExercise.reason || `Say the letter ${currentExercise.next_letter}`, () => startListening());
      }, 800);
    }
  };

  /* ---------------- UI Guards ---------------- */

  if (!isSupported) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-8 text-white text-center shadow-xl">
          <AlertCircle className="w-20 h-20 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-4">Voice Recognition Required</h3>
          <p className="text-lg mb-6 opacity-90">
            Please use Chrome, Edge, or Safari for the best learning experience.
          </p>
          <button 
            onClick={onExit} 
            className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all mx-auto shadow-lg"
          >
            <Home size={20} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading && !currentExercise) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-2xl p-12 shadow-xl text-center">
          <Brain className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-spin" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Loading Learning Mode</h3>
          <p className="text-gray-600 mb-8">Preparing your personalized exercise...</p>
          <button 
            onClick={onExit} 
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mx-auto"
          >
            <Home size={20} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const accuracy = totalAttempts === 0 ? 0 : (correctAttempts / totalAttempts) * 100;

  /* ---------------- UI ---------------- */

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-lg transition-all hover:scale-105"
        >
          <Home size={24} />
          Back to Home
        </button>

        <div className="flex items-center gap-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-8 py-4 shadow-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Zap className="text-orange-500" size={24} />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Streak</div>
              <div className="text-2xl font-bold text-gray-900">{streak}</div>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-200" />

          <div className="flex items-center gap-3">
            <Trophy 
              className={`text-2xl ${
                accuracy >= 90 ? 'text-emerald-500' : 
                accuracy >= 75 ? 'text-amber-500' : 
                'text-red-500'
              }`} 
            />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">{Math.round(accuracy)}%</div>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-200" />

          <div className="flex items-center gap-3">
            <Timer className="text-blue-500" size={24} />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Attempts</div>
              <div className="text-2xl font-bold text-gray-900">{totalAttempts}</div>
            </div>
          </div>

          <button
            onClick={toggleAssistantMode}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all shadow-md ${
              assistantMode 
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-300/50' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 hover:shadow-blue-100'
            }`}
            disabled={loading}
          >
            {assistantMode ? (
              <>
                <StopCircle size={20} />
                <span>Assistant Active</span>
              </>
            ) : (
              <>
                <PlayCircle size={20} />
                <span>Enable Assistant</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-lg text-red-900 mb-1">{apiError}</h4>
              <button
                onClick={loadNextLetter}
                className="text-red-600 hover:text-red-700 font-medium underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise */}
      {currentExercise && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 relative overflow-hidden border border-white/50">
          {showCelebration && (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-500">
              <div className="text-center text-white drop-shadow-2xl">
                <CheckCircle className="w-28 h-28 mx-auto mb-6 opacity-95 animate-bounce" />
                <div className="text-4xl font-black mb-2 tracking-tight">PERFECT!</div>
                <div className="text-2xl opacity-90 font-semibold">Next challenge loading...</div>
              </div>
            </div>
          )}

          <div className="space-y-8 relative z-10">
            {/* Instructions */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-200 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-lg font-bold text-emerald-900 uppercase tracking-wider">AI Challenge</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">
                {currentExercise.encouragement || 'Your Next Challenge'}
              </h2>
              <p className="text-xl text-gray-700 leading-relaxed">
                {currentExercise.reason || `Practice saying letter ${currentExercise.next_letter}`}
              </p>
            </div>

            {/* Braille + Reveal */}
            <div className="flex flex-col items-center gap-8 pt-4">
              <BrailleDisplay dots={dots} size="xl" showLabel={false} />
              
              <button
                onClick={() => speak(`Letter ${currentExercise.next_letter} - say it clearly`)}
                disabled={isSpeaking || loading}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Volume2 size={24} className="group-hover:scale-110 transition-transform" />
                <span>🔊 Reveal Answer</span>
              </button>
            </div>

            {/* Main Interaction Area */}
            <div className="border-t-4 border-gray-100 pt-12">
              <div className="text-center space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={loading}
                    className={`relative group w-32 h-32 rounded-3xl flex items-center justify-center transition-all duration-300 shadow-2xl ${
                      isListening
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-110 shadow-red-400/50'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 hover:scale-110 shadow-emerald-400/50'
                    } disabled:opacity-50 disabled:shadow-none`}
                  >
                    <Mic size={48} className="text-white drop-shadow-lg relative z-10" />
                    {isListening && (
                      <div className="absolute inset-0 rounded-3xl bg-red-400/60 animate-ping [animation-duration:1s]"></div>
                    )}
                  </button>

                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                      {isListening ? '🎤 Listening...' : 'Tap Mic or Press SPACE'}
                    </h3>
                    <div className="h-12 flex items-center justify-center">
                      {voiceError ? (
                        <p className="text-red-600 text-lg font-semibold flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl">
                          <AlertCircle size={20} />
                          {getSpeechErrorMessage(voiceError)}
                        </p>
                      ) : isListening ? (
                        <p className="text-emerald-600 text-xl font-bold bg-emerald-50 px-6 py-3 rounded-2xl animate-pulse min-h-[3rem] flex items-center justify-center">
                          {interimTranscript || 'Say the letter name...'}
                        </p>
                      ) : (
                        <p className="text-gray-500 text-lg font-medium px-6 py-3 bg-gray-50 rounded-2xl">
                          Speak the letter name clearly
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {feedback && !showCelebration && (
                  <div className={`rounded-3xl p-8 shadow-2xl border-4 animate-in slide-in-from-bottom-4 ${
                    feedback.tone === 'celebration'
                      ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 shadow-emerald-200/50'
                      : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-400 shadow-orange-200/50'
                  }`}>
                    <div className="text-3xl font-black mb-4 tracking-tight flex items-center justify-center gap-3">
                      {feedback.tone === 'celebration' ? '✅' : '⚠️'}
                      {feedback.message}
                    </div>
                    <div className="text-xl text-gray-800 leading-relaxed">{feedback.suggestion}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streak Celebration */}
      {streak >= 3 && (
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 rounded-3xl p-8 text-white text-center shadow-2xl animate-bounce [animation-duration:2s] flex items-center justify-center gap-4">
          <span className="text-3xl">🔥</span>
          <span className="text-2xl font-black tracking-tight">{getStreakMessage(streak)}</span>
          <span className="text-3xl">🔥</span>
        </div>
      )}

      {/* How it Works - Simplified */}
      {!currentExercise && !loading && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-12 text-center border border-blue-200">
          <Brain className="w-24 h-24 text-blue-500 mx-auto mb-8 opacity-75" />
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Adaptive Learning Mode</h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            AI analyzes your performance and serves personalized exercises focusing on your weak areas.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: '🧠', title: 'AI Adaptive', desc: 'Smart letter selection' },
              { icon: '🎯', title: 'Weak Focus', desc: 'Prioritizes mistakes' },
              { icon: '⚡', title: 'Real-time', desc: 'Instant feedback' },
              { icon: '📊', title: 'Progress', desc: 'Tracks mastery' }
            ].map((item, i) => (
              <div key={i} className="space-y-2 p-4">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-bold text-lg text-gray-900">{item.title}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
