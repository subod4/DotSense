import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tutorialService } from '../api/services.js'
import DotsView from '../components/DotsView.jsx'

export default function TutorialMode({ userId }) {
  const navigate = useNavigate()
  const [tutorialId, setTutorialId] = useState(null)
  const [step, setStep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [practiceMode, setPracticeMode] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [listening, setListening] = useState(false)
  const [comparison, setComparison] = useState(null)

  // Start tutorial session on mount
  useEffect(() => {
    async function initTutorial() {
      setLoading(true)
      setError('')
      try {
        const res = await tutorialService.start(userId || 'guest')
        setTutorialId(res.tutorial_id)
        setStep(res)
      } catch (e) {
        setError(e.message || 'Failed to start tutorial')
      } finally {
        setLoading(false)
      }
    }
    initTutorial()
  }, [userId])

  // Cleanup tutorial on unmount
  useEffect(() => {
    return () => {
      if (tutorialId) {
        tutorialService.end(tutorialId).catch(() => { })
      }
    }
  }, [tutorialId])

  const progressText = step?.progress
    ? `${step.progress.current} / ${step.progress.total}`
    : '-'

  const isComplete = step?.progress?.current > step?.progress?.total

  function handlePlayAudio() {
    if (!step?.spoken_text) return
    window.speechSynthesis.cancel()
    const msg = new SpeechSynthesisUtterance(step.spoken_text)
    window.speechSynthesis.speak(msg)
  }

  function handlePractice() {
    setPracticeMode(true)
    handlePlayAudio()
  }

  function handleMic() {
    if (!step?.letter) return
    setListening(true)
    setError('')

    // Simulated speech recognition (replace with real Web Speech API if needed)
    setTimeout(() => {
      const guessPool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      const said = guessPool[Math.floor(Math.random() * guessPool.length)]
      const correct = said.toLowerCase() === step.letter.toLowerCase()
      setComparison({ asked: step.letter.toUpperCase(), said: said.toUpperCase(), correct })
      setAttempts((v) => v + 1)
      if (!correct) {
        setError('We could not match that. Try again and speak clearly.')
      } else {
        setError('')
      }
      setListening(false)
    }, 1100)
  }

  const handleNext = useCallback(async () => {
    if (!tutorialId) return
    setLoading(true)
    setError('')
    try {
      const res = await tutorialService.next(tutorialId)
      setStep(res)
      setPracticeMode(false)
      setAttempts(0)
      setComparison(null)
    } catch (e) {
      setError(e.message || 'Failed to go to next letter')
    } finally {
      setLoading(false)
    }
  }, [tutorialId])

  const handlePrev = useCallback(async () => {
    if (!tutorialId) return
    setLoading(true)
    setError('')
    try {
      const res = await tutorialService.previous(tutorialId)
      setStep(res)
      setPracticeMode(false)
      setAttempts(0)
      setComparison(null)
    } catch (e) {
      setError(e.message || 'Failed to go to previous letter')
    } finally {
      setLoading(false)
    }
  }, [tutorialId])

  const handleRepeat = useCallback(async () => {
    if (!tutorialId) return
    setLoading(true)
    try {
      const res = await tutorialService.repeat(tutorialId)
      setStep(res)
      handlePlayAudio()
    } catch (e) {
      setError(e.message || 'Failed to repeat')
    } finally {
      setLoading(false)
    }
  }, [tutorialId])

  if (loading && !step) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-surface-border border-t-primary animate-spin" />
          <p className="text-text-muted">Loading tutorial...</p>
        </div>
      </div>
    )
  }

  if (error && !step) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-surface border border-surface-border text-center space-y-6">
          <div className="p-4 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20">
            {error}
          </div>
          <button
            className="w-full px-6 py-3 rounded-xl font-bold bg-primary text-background hover:bg-primary/90 transition-colors"
            onClick={() => navigate('/home')}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-surface border border-surface-border text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 text-primary grid place-items-center text-4xl mx-auto">
            ✓
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">Tutorial Complete!</h2>
            <p className="text-text-muted">You finished the guided letters. Continue to learning mode.</p>
          </div>
          <div className="grid gap-3">
            <button
              className="w-full px-6 py-3 rounded-xl font-bold bg-primary text-background hover:bg-primary/90 transition-colors"
              onClick={() => navigate('/learn')}
            >
              Go to Learning
            </button>
            <button
              className="w-full px-6 py-3 rounded-xl font-medium text-text-muted hover:text-text hover:bg-surface-soft transition-colors"
              onClick={() => navigate('/home')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <button
          className="text-text-muted hover:text-text hover:underline underline-offset-4"
          onClick={() => navigate('/home')}
        >
          ← Exit Tutorial
        </button>
        <div className="px-3 py-1 rounded-full bg-surface-soft border border-surface-border text-sm font-medium text-text-muted">
          Progress: {progressText}
        </div>
      </header>

      <div className="p-1 rounded-3xl bg-gradient-to-br from-surface-border to-surface-soft p-[1px]">
        <div className="bg-surface rounded-[23px] p-6 md:p-8 space-y-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-bold">Letter <span className="text-primary">{step?.letter?.toUpperCase()}</span></h2>
            <div className="text-sm font-bold text-text-muted bg-surface-soft px-3 py-1 rounded-lg">
              Attempts: <span className="text-text">{attempts > 0 ? attempts : '-'}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-surface-soft border border-surface-border gap-6">
            <div className="text-8xl font-black text-text drop-shadow-xl">{step?.letter?.toUpperCase()}</div>
            {step?.dots && <DotsView dots={step.dots} />}
          </div>

          {!practiceMode ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-surface-soft border border-surface-border space-y-4">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Voice Prompt</div>
                <div className="text-lg font-medium leading-relaxed">"{step?.spoken_text}"</div>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-surface-border hover:bg-surface hover:text-primary transition-colors"
                  onClick={handlePlayAudio}
                >
                  🔊 Play Audio
                </button>
              </div>
              <div className="p-6 rounded-2xl bg-surface-soft border border-surface-border space-y-4">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Description</div>
                <p className="text-text-muted leading-relaxed">
                  Focus on the dot pattern. The raised dots form the letter {step?.letter?.toUpperCase()}.
                </p>
                <button
                  className="w-full px-4 py-2 rounded-xl text-sm font-bold bg-primary text-background hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  onClick={handlePractice}
                >
                  Start Practice
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-lg mx-auto text-center">
              <button
                className={`w-full p-8 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group
                  ${listening
                    ? 'border-accent-danger bg-accent-danger/10 shadow-[0_0_30px_rgba(248,113,113,0.2)] scale-105'
                    : 'border-surface-border bg-surface-soft hover:border-primary/50 hover:bg-surface-soft/80'
                  }`}
                onClick={handleMic}
                aria-pressed={listening}
                disabled={loading}
              >
                <span className={`text-4xl transition-transform duration-300 ${listening ? 'scale-110 animate-pulse' : 'group-hover:scale-110'}`}>
                  {listening ? '🎙️' : '🎤'}
                </span>
                <span className={`text-lg font-bold ${listening ? 'text-accent-danger' : 'text-text'}`}>
                  {listening ? 'Listening...' : 'Tap to Speak'}
                </span>
              </button>

              <div className="text-text-muted">
                Say <span className="font-bold text-text">"{step?.letter?.toUpperCase()}"</span>, "Next", or "Back"
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              {comparison && (
                <div className="flex items-center justify-center gap-4 text-lg animate-in fade-in zoom-in-95">
                  <span className="text-text-muted">Asked: <span className="font-bold text-text">{comparison.asked}</span></span>
                  <span className="text-surface-border">|</span>
                  <span className={comparison.correct ? 'text-primary font-bold' : 'text-accent-danger font-bold'}>
                    You Said: {comparison.said} {comparison.correct ? '✅' : '❌'}
                  </span>
                </div>
              )}

              <button
                className="px-6 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-surface-soft transition-colors"
                onClick={handleRepeat}
                disabled={loading}
              >
                ↻ Repeat Letter
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-surface-border">
            <button
              className="px-6 py-3 rounded-xl font-medium text-text-muted hover:text-text hover:bg-surface-soft transition-colors disabled:opacity-50"
              onClick={handlePrev}
              disabled={loading || step?.progress?.current === 1}
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                className="px-6 py-3 rounded-xl font-medium text-text-muted hover:text-text hover:bg-surface-soft transition-colors"
                onClick={() => setPracticeMode(false)}
              >
                Instruction
              </button>
              <button
                className="px-6 py-3 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
                onClick={handleNext}
                disabled={loading}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
