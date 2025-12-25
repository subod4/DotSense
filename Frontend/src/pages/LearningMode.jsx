import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { learningService } from '../api/services.js'
import { calculateAccuracy, calculateSkillScore, calculateMasteryLevel, getMasteryColor, getMasteryLabel, formatTimeUntilReview } from '../utils/learningCalculations.js'
import { FEEDBACK_MESSAGES, LEARNING_MODES } from '../utils/learningConstants.js'
import LearningDashboard from '../components/LearningDashboard.jsx'

// Initialize SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function LearningMode({ user }) {
  const navigate = useNavigate()
  const [streak, setStreak] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [assistantOn, setAssistantOn] = useState(true)
  const [listening, setListening] = useState(false)
  const [asked, setAsked] = useState('A')
  const [said, setSaid] = useState('')
  const [comparison, setComparison] = useState(null)
  const [showCelebrate, setShowCelebrate] = useState(false)
  const [reason, setReason] = useState('Loading next letter...')
  const [sessionId] = useState(() => `SESSION-${Date.now()}`)
  const [startTime, setStartTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [masteryStatus, setMasteryStatus] = useState({})
  const [letterDetails, setLetterDetails] = useState({})
  const [currentLetterStats, setCurrentLetterStats] = useState(null)
  const [sttSupported, setSttSupported] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [currentMode, setCurrentMode] = useState('guided')
  const [recommendations, setRecommendations] = useState([])
  const [fatigueWarning, setFatigueWarning] = useState(false)
  const [nextReviewIn, setNextReviewIn] = useState('')
  const [newAchievements, setNewAchievements] = useState([])

  const recognitionRef = useRef(null)
  const isRecognitionActiveRef = useRef(false)
  const pendingRetryRef = useRef(false)
  const retryCountRef = useRef(0)
  const processVoiceResultRef = useRef(null)
  const userRef = useRef(user)
  const startTimeRef = useRef(null)
  const askedRef = useRef('A')
  const maxRetries = 2

  // Keep refs in sync with state
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { startTimeRef.current = startTime }, [startTime])
  useEffect(() => { askedRef.current = asked }, [asked])

  // Available letters for learning
  const availableLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

  // Initialize Speech Recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available')
      setSttSupported(false)
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 5

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true
        setListening(true)
        setTranscript('')
        setError(null)
      }

      recognition.onresult = (event) => {
        const results = event.results
        if (results.length > 0) {
          const lastResult = results[results.length - 1]
          const transcriptText = lastResult[0].transcript.trim()
          setTranscript(transcriptText)
          retryCountRef.current = 0 // Reset retry count on successful result
          setRetryCount(0)
          pendingRetryRef.current = false

          // If final result, process the answer using ref to get latest function
          if (lastResult.isFinal && processVoiceResultRef.current) {
            processVoiceResultRef.current(transcriptText, lastResult)
          }
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)

        if (event.error === 'no-speech') {
          // Check if we should retry
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current += 1
            setRetryCount(retryCountRef.current)
            pendingRetryRef.current = true
            // Don't set listening to false - let onend handle the retry
          } else {
            // Max retries reached
            retryCountRef.current = 0
            setRetryCount(0)
            pendingRetryRef.current = false
            setError('No speech detected. Speak louder or closer to the mic.')
          }
          return // Let onend handle state cleanup
        } else if (event.error === 'audio-capture') {
          setError('No microphone found. Please check your microphone.')
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access.')
        } else if (event.error === 'aborted') {
          // User cancelled, no error needed
          setError(null)
        } else {
          setError(`Speech error: ${event.error}`)
        }
        pendingRetryRef.current = false
        retryCountRef.current = 0
        setRetryCount(0)
      }

      recognition.onend = () => {
        isRecognitionActiveRef.current = false

        // Check if we need to retry
        if (pendingRetryRef.current && recognitionRef.current) {
          // Small delay before retry to ensure clean state
          setTimeout(() => {
            if (pendingRetryRef.current && recognitionRef.current && !isRecognitionActiveRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.error('Retry failed:', e)
                pendingRetryRef.current = false
                retryCountRef.current = 0
                setRetryCount(0)
                setListening(false)
                setError('No speech detected. Tap mic to try again.')
              }
            }
          }, 150)
        } else {
          setListening(false)
        }
      }

      recognitionRef.current = recognition
      console.log('Speech recognition initialized successfully')

      return () => {
        pendingRetryRef.current = false
        retryCountRef.current = 0
        if (recognitionRef.current) {
          recognitionRef.current.abort()
        }
      }
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err)
      setSttSupported(false)
      setError('Failed to initialize speech recognition.')
    }
  }, [])

  // Feedback message mapping
  const feedbackMessages = {
    // Correct answers
    'perfect': '🎉 Perfect! Great job!',
    'correct': '✅ Correct! Well done!',
    'correct_letter': '✅ Correct!',
    'excellent': '🌟 Excellent! You\'re on fire!',
    'streak_bonus': '🔥 Amazing streak! Keep it up!',
    'streak_milestone': '🔥 Incredible streak!',
    'mastery_achieved': '🏆 You\'ve mastered this letter!',
    'good_progress': '👍 Good progress!',
    'improving': '📈 You\'re improving! Keep going!',
    'achievement_unlocked': '🏆 Achievement Unlocked!',

    // Incorrect answers
    'confusion_help': '🤔 That was a different letter. Listen again and try!',
    'try_again': '💪 Not quite. Give it another try!',
    'keep_practicing': '📚 Keep practicing, you\'ll get it!',
    'wrong_letter': '❌ Oops! That wasn\'t the right letter.',
    'similar_sound': '🔊 These letters sound similar. Listen carefully!',
    'take_break': '😴 Your performance is declining. Consider a break!',
    'fatigue_detected': '💤 You seem tired. Take a short break!',

    // General
    'new_letter': '✨ Let\'s learn a new letter!',
    'review_time': '🔄 Time to review this letter.',
    'challenge': '🎯 Challenge mode! Show what you\'ve learned!',
  }

  const getFeedbackMessage = (feedback) => {
    if (!feedback) return 'Keep practicing!'

    // If feedback has a direct message, use it
    if (feedback.message && typeof feedback.message === 'string') {
      return feedback.message
    }

    // Map message_key to friendly message
    const key = feedback.message_key || feedback.type
    if (key && feedbackMessages[key]) {
      return feedbackMessages[key]
    }

    // Check for FEEDBACK_MESSAGES from constants
    if (key && FEEDBACK_MESSAGES[key]) {
      return FEEDBACK_MESSAGES[key]
    }

    // Fallback based on correct/incorrect
    if (feedback.correct === false || feedback.type === 'incorrect' || feedback.type === 'corrective') {
      return '💪 Not quite right. Try again!'
    }
    if (feedback.correct === true || feedback.type === 'correct' || feedback.type === 'positive') {
      return '✅ Correct! Well done!'
    }

    return 'Keep practicing!'
  }

  // Process voice recognition result
  const processVoiceResult = async (transcriptText, result) => {
    const currentUser = userRef.current
    const currentStartTime = startTimeRef.current
    const currentAsked = askedRef.current

    if (!currentUser?.id || !currentStartTime) {
      console.log('processVoiceResult: missing user or startTime', { userId: currentUser?.id, startTime: currentStartTime })
      return
    }

    // Extract single letter from transcript
    const guess = extractLetter(transcriptText, result)

    if (!guess) {
      setError(`Couldn't understand "${transcriptText}". Please say a letter clearly.`)
      return
    }

    setSaid(guess)

    const responseTime = (Date.now() - currentStartTime) / 1000
    const correct = guess.toUpperCase() === currentAsked.toUpperCase()

    setComparison({ asked: currentAsked, said: guess, correct })
    setAttempts((v) => v + 1)

    try {
      const res = await learningService.recordAttempt({
        user_id: currentUser.id,
        target_letter: currentAsked.toLowerCase(),
        spoken_letter: guess.toLowerCase(),
        response_time: responseTime,
        session_id: sessionId
      })

      if (res.feedback) {
        setReason(getFeedbackMessage(res.feedback))

        // Handle achievements
        if (res.feedback.achievements && res.feedback.achievements.length > 0) {
          setNewAchievements(res.feedback.achievements)
          setTimeout(() => setNewAchievements([]), 5000)
        }
      }

      if (res.next_review_in) {
        setNextReviewIn(res.next_review_in)
      }

      if (res.result) {
        setStreak(res.result.streak || 0)
        if (res.result.accuracy != null) {
          setAccuracy(Math.round(res.result.accuracy * 100))
        }

        // Check for fatigue warning
        if (res.result.fatigue_warning) {
          setFatigueWarning(true)
        }

        // Check for new achievements in result
        if (res.result.new_achievements && res.result.new_achievements.length > 0) {
          setNewAchievements(res.result.new_achievements)
          setTimeout(() => setNewAchievements([]), 5000)
        }
      }

      if (correct) {
        setShowCelebrate(true)
        setTimeout(() => {
          setShowCelebrate(false)
          loadNextLetter()
        }, 1200)
      } else {
        loadStats()
      }
    } catch (err) {
      console.error('Error recording attempt:', err)
      if (correct) {
        setStreak((v) => v + 1)
        setShowCelebrate(true)
        setTimeout(() => {
          setShowCelebrate(false)
          loadNextLetter()
        }, 1200)
      } else {
        setStreak(0)
      }
    }
  }

  // Extract letter from spoken text
  const extractLetter = (text, result) => {
    const normalized = text.toLowerCase().trim()

    // Direct single letter match
    if (normalized.length === 1 && /^[a-z]$/.test(normalized)) {
      return normalized.toUpperCase()
    }

    // Common phonetic mappings for letters
    const phoneticMap = {
      'a': ['a', 'ay', 'hey', 'eh'],
      'b': ['b', 'be', 'bee', 'bea'],
      'c': ['c', 'see', 'sea', 'si'],
      'd': ['d', 'de', 'dee', 'the'],
      'e': ['e', 'ee', 'he'],
      'f': ['f', 'ef', 'eff'],
      'g': ['g', 'gee', 'ji', 'ge'],
      'h': ['h', 'age', 'aitch', 'ach'],
      'i': ['i', 'eye', 'ai', 'aye'],
      'j': ['j', 'jay', 'je', 'jey']
    }

    // Check phonetic matches
    for (const [letter, variants] of Object.entries(phoneticMap)) {
      if (variants.some(v => normalized === v || normalized.includes(v))) {
        return letter.toUpperCase()
      }
    }

    // Check all alternatives from speech recognition
    if (result && result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        const alt = result[i].transcript.toLowerCase().trim()
        if (alt.length === 1 && /^[a-z]$/.test(alt)) {
          return alt.toUpperCase()
        }
        for (const [letter, variants] of Object.entries(phoneticMap)) {
          if (variants.some(v => alt === v)) {
            return letter.toUpperCase()
          }
        }
      }
    }

    // Last resort: first letter of the word
    const firstChar = normalized.charAt(0)
    if (/^[a-z]$/.test(firstChar)) {
      return firstChar.toUpperCase()
    }

    return null
  }

  // Keep processVoiceResultRef updated with the latest function
  useEffect(() => {
    processVoiceResultRef.current = processVoiceResult
  }, [processVoiceResult])

  useEffect(() => {
    if (user?.id) {
      loadNextLetter()
      loadStats()
    }
  }, [user])

  async function loadNextLetter() {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      setFatigueWarning(false)
      const result = await learningService.getStep(user.id, availableLetters)

      // Backend returns next_letter field
      const nextLetter = (result.next_letter || 'A').toUpperCase()
      setAsked(nextLetter)
      setReason(result.reason || 'New letter to practice.')
      setComparison(null)
      setStartTime(Date.now())

      // POST the letter to Braille display API in required format
      try {
        await fetch('http://localhost:8000/api/braille/letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ letter: nextLetter }),
        })
      } catch (e) {
        // Optionally handle/log error
        console.error('Failed to post letter to Braille display:', e)
      }

      // Store mode
      if (result.mode) {
        setCurrentMode(result.mode)
      }

      // Store mastery status from backend
      if (result.mastery_status) {
        setMasteryStatus(result.mastery_status)
      }

      // Store detailed letter info
      if (result.letter_details) {
        setLetterDetails(result.letter_details)
      }

      // Store current letter context
      if (result.context) {
        setCurrentLetterStats(result.context)
      }

      // Store recommendations
      if (result.recommendations) {
        setRecommendations(result.recommendations)
      }
    } catch (err) {
      console.error('Error loading next letter:', err)
      setError('Failed to load next letter')
      setReason('Using fallback letter.')
    } finally {
      setLoading(false)
    }
  }

  function handleReveal() {
    const msg = new SpeechSynthesisUtterance(`The letter is ${asked}`)
    window.speechSynthesis.speak(msg)
  }

  function handleMic() {
    if (!user?.id) {
      setError('Please log in to use speech recognition.')
      return
    }
    if (!sttSupported || !recognitionRef.current) {
      setError('Speech recognition is not available in this browser.')
      return
    }

    // Set start time if not already set
    if (!startTime) {
      setStartTime(Date.now())
    }

    setError(null)

    if (listening || isRecognitionActiveRef.current) {
      // Stop listening if already active
      pendingRetryRef.current = false
      retryCountRef.current = 0
      setRetryCount(0)
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore stop errors
      }
    } else {
      // Start listening
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('Error starting recognition:', err)
        // If already started, stop and restart
        if (err.name === 'InvalidStateError') {
          pendingRetryRef.current = false
          try {
            recognitionRef.current.stop()
          } catch (e) {
            // Ignore stop errors
          }
          setTimeout(() => {
            if (!isRecognitionActiveRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                setError('Could not start speech recognition. Please refresh.')
              }
            }
          }, 200)
        } else {
          setError('Could not start speech recognition. Please try again.')
        }
      }
    }
  }

  async function loadStats() {
    if (!user?.id) return

    try {
      const stats = await learningService.getStats(user.id)
      if (stats.overall_accuracy != null) {
        setAccuracy(Math.round(stats.overall_accuracy * 100))
      }
      if (stats.current_streak != null) {
        setStreak(stats.current_streak)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  // Get mastery color for current letter
  const currentMasteryLevel = masteryStatus[asked.toLowerCase()] || 'learning'
  const masteryColor = getMasteryColor(currentMasteryLevel)
  const currentLetterDetail = letterDetails[asked.toLowerCase()] || {}
  const modeConfig = LEARNING_MODES[currentMode] || LEARNING_MODES.guided

  // Show dashboard if toggled
  if (showDashboard) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <LearningDashboard
            userId={user?.id}
            onClose={() => setShowDashboard(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4">
        <button className="text-text-muted hover:text-text hover:underline underline-offset-4" onClick={() => navigate('/home')}>
          ← Exit Learning
        </button>
        <div className="flex items-center gap-3 bg-surface border border-surface-border rounded-full p-1.5 pr-4 shadow-sm" aria-label="Session stats">
          <span className={`px-3 py-1 rounded-full font-bold text-sm ${streak > 0 ? 'bg-green-500/10 text-green-500' : 'bg-surface-soft text-text-muted'}`}>
            🔥 {streak}
          </span>
          <span className="text-sm font-bold text-text-muted">
            {accuracy}% Acc
          </span>
          <span className="text-sm font-bold text-text-muted">
            {attempts} Tries
          </span>
          <button
            className="ml-2 w-6 h-6 rounded-full bg-surface-soft text-text-muted hover:text-text grid place-items-center transition-colors"
            onClick={() => setShowDashboard(true)}
            aria-label="View Stats"
          >
            📊
          </button>
        </div>
      </header>

      <div className="p-1 rounded-[28px] bg-gradient-to-br from-surface-border to-surface-soft p-[1px] shadow-2xl">
        <div className="bg-surface rounded-[27px] p-6 md:p-10 space-y-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

          {error ? (
            <div className="p-4 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20 flex gap-3 items-center" role="alert">
              <span className="text-xl">⚠️</span>
              <p className="font-medium">{error}</p>
            </div>
          ) : null}

          {/* Fatigue warning */}
          {fatigueWarning && (
            <div className="p-4 rounded-xl bg-accent-amber/10 text-accent-amber border border-accent-amber/20 flex gap-3 items-center animate-in fade-in slide-in-from-top-2" role="alert">
              <span className="text-xl">💤</span>
              <p className="font-medium">You seem tired. Consider taking a short break!</p>
            </div>
          )}

          {/* Achievement toast */}
          {newAchievements.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-max max-w-[90%] bg-gradient-to-r from-accent-amber to-yellow-500 text-black p-4 rounded-2xl shadow-xl animate-in slide-in-from-top-4 fade-in zoom-in-95 text-center">
              {newAchievements.map((achievement, i) => (
                <div key={i}>
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="font-black text-lg">{achievement.title}</div>
                  <div className="font-medium opacity-90 text-sm">{achievement.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Indicators */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="flex items-center gap-2 text-text-muted text-sm font-medium uppercase tracking-wider">
              <span>{modeConfig.icon}</span>
              <span>{modeConfig.label}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest text-background`} style={{ backgroundColor: masteryColor }}>
                {getMasteryLabel(currentMasteryLevel)}
              </span>
              {currentLetterDetail.retention !== undefined && currentLetterDetail.retention < 0.8 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold text-accent-danger bg-accent-danger/10 border border-accent-danger/20">
                  ⚠️ Review
                </span>
              )}
            </div>
          </div>

          {/* Main Card */}
          <div className="flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="text-center space-y-2">
              <div className="text-sm font-bold text-text-muted uppercase tracking-wider">Current Letter</div>
              <div
                className="text-9xl font-black relative drop-shadow-2xl"
                style={{ color: masteryColor, textShadow: `0 0 60px ${masteryColor}40` }}
              >
                {asked}
              </div>
              <p className="text-text-muted font-medium">{typeof reason === 'string' ? reason : reason?.message || JSON.stringify(reason)}</p>
            </div>

            {/* Current letter stats */}
            {currentLetterStats && (
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-text-muted bg-surface-soft/50 p-3 rounded-xl border border-surface-border/50">
                <span>Attempts: {currentLetterStats.attempts}</span>
                <span className="w-1 h-1 rounded-full bg-surface-border" />
                <span>Correct: {currentLetterStats.correct}</span>
                <span className="w-1 h-1 rounded-full bg-surface-border" />
                <span>Streak: {currentLetterStats.streak}</span>
                {currentLetterStats.trend && currentLetterStats.trend !== 'insufficient_data' && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-surface-border" />
                    <span
                      className={currentLetterStats.trend === 'improving' ? 'text-green-500' : currentLetterStats.trend === 'declining' ? 'text-red-500' : ''}
                    >
                      {currentLetterStats.trend === 'improving' ? '📈' : currentLetterStats.trend === 'declining' ? '📉' : '➡️'} {currentLetterStats.trend}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              className="px-6 py-2 rounded-xl text-sm font-bold bg-surface-soft text-text hover:bg-surface-soft/80 border border-surface-border hover:border-text-muted/30 transition-all active:scale-95"
              onClick={handleReveal}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🔊 Hear Letter'}
            </button>
          </div>

          {comparison ? (
            <div className="p-4 rounded-xl bg-surface-soft border border-surface-border text-center space-y-2 animate-in fade-in zoom-in-95">
              <div className="text-text-muted text-sm">You said:</div>
              <div className={`text-3xl font-black ${comparison.correct ? 'text-primary' : 'text-accent-danger'}`}>
                {comparison.said} {comparison.correct ? '✅' : '❌'}
              </div>
              {!comparison.correct && <div className="text-sm">Asked: <span className="font-bold">{comparison.asked}</span></div>}
            </div>
          ) : null}

          {/* Mic Interaction */}
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-surface-border/50">
            <button
              className={`w-full max-w-sm p-8 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden
                ${listening
                  ? 'border-accent-danger bg-accent-danger/10 shadow-[0_0_0_8px_rgba(248,113,113,0.1)] scale-105'
                  : 'border-surface-border bg-surface-soft hover:border-primary/50 hover:bg-surface-soft/80'
                }`}
              onClick={handleMic}
              aria-pressed={listening}
              disabled={loading || !sttSupported}
            >
              {listening && <div className="absolute inset-0 bg-accent-danger/5 animate-pulse" />}
              <span className={`text-4xl transition-transform duration-300 relative z-10 ${listening ? 'scale-110 animate-bounce' : 'group-hover:scale-110'}`}>
                {listening ? '🎙️' : '🎤'}
              </span>
              <span className={`text-lg font-bold relative z-10 ${listening ? 'text-accent-danger' : 'text-text'}`}>
                {listening ? (retryCount > 0 ? `Retrying (${retryCount})...` : 'Listening...') : 'Tap to Speak'}
              </span>
            </button>

            {/* Live transcript display */}
            {listening && (
              <div className="h-8 text-center">
                <span className="text-primary font-bold animate-pulse">{transcript ? `"${transcript}"` : 'Listening...'}</span>
              </div>
            )}

            <div className="text-sm text-text-muted h-6">
              {!sttSupported ? (
                <span className="text-accent-danger">Speech recognition not supported</span>
              ) : listening ? (
                retryCount > 0 ? 'Didn\'t catch that, listening again...' : 'Say the letter clearly'
              ) : (
                'Tap mic and say the letter'
              )}
            </div>
          </div>

          {/* Letter mastery overview */}
          <div className="flex flex-wrap justify-center gap-2 pt-6">
            {availableLetters.map(letter => {
              const level = masteryStatus[letter] || 'new'
              const color = level === 'new' ? '#6b7280' : getMasteryColor(level)
              const isActive = letter.toUpperCase() === asked
              return (
                <div
                  key={letter}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all border-2
                    ${isActive ? 'scale-110 shadow-lg ring-2 ring-offset-2 ring-offset-bg ring-current' : 'opacity-80 hover:opacity-100 hover:scale-105'}
                  `}
                  style={{
                    backgroundColor: isActive ? color : 'transparent',
                    borderColor: color,
                    color: isActive ? '#fff' : (level === 'new' ? '#6b7280' : color),
                    boxShadow: isActive ? `0 4px 12px ${color}40` : 'none'
                  }}
                  title={`${letter.toUpperCase()}: ${getMasteryLabel(level)}`}
                >
                  {letter.toUpperCase()}
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-4 rounded-xl bg-surface-soft border border-surface-border text-sm space-y-2">
              <div className="font-bold text-text-muted uppercase text-xs tracking-wider">Recommended</div>
              <div className="flex flex-wrap gap-2">
                {recommendations.map((rec, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-white/5 text-xs text-text-muted">
                    {typeof rec === 'string' ? rec : rec?.message || JSON.stringify(rec)}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
