import { useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { learningService } from '../api/services.js'
import Field from '../components/Field.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import JsonView from '../components/JsonView.jsx'
import DotsView from '../components/DotsView.jsx'
import { useEffect } from 'react'

function parseLetters(input) {
  const raw = (input || '').toLowerCase()
  const letters = raw
    .split(/[^a-z]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  // ensure unique, preserve order
  const seen = new Set()
  return letters.filter((l) => {
    if (l.length !== 1) return false
    if (seen.has(l)) return false
    seen.add(l)
    return true
  })
}

export default function Learning() {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [userId, setUserId] = useState('')
  const [availableLettersText, setAvailableLettersText] = useState('a b c d e f g h i j')

  const [step, setStep] = useState(null)

  // Post the character shown in learn page to /api/braille/letter whenever it changes
  
  useEffect(() => {
    if (step?.next_letter && typeof step.next_letter === 'string') {
      api.post('/api/braille/letter', { body: step.next_letter });
    }
  }, [step?.next_letter]);

  const [targetLetter, setTargetLetter] = useState('')
  const [spokenLetter, setSpokenLetter] = useState('')
  const [responseTime, setResponseTime] = useState(1.2)
  const [sessionId, setSessionId] = useState('')
  const [attempt, setAttempt] = useState(null)

  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState(null)
  const [attempts, setAttempts] = useState(null)

  const availableLetters = useMemo(() => parseLetters(availableLettersText), [availableLettersText])

  async function getStep() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/learning/step', {
        body: { user_id: userId, available_letters: availableLetters },
      })
      setStep(res)
      setTargetLetter(res?.next_letter || '')

      // ...existing code...
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function recordAttempt() {
    setLoading(true)
    setError(null)
  try {
      const res = await api.post('/api/learning/attempt', {
        body: {
          user_id: userId,
          target_letter: targetLetter,
          spoken_letter: spokenLetter,
          response_time: Number(responseTime),
          session_id: sessionId || null,
        },
      })
      setAttempt(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getStats() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/learning/stats/${encodeURIComponent(userId)}`)
      setStats(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function resetProgress() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/api/learning/reset/${encodeURIComponent(userId)}`)
      setStats(res)
      setStep(null)
      setAttempt(null)
      setSessions(null)
      setAttempts(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getSessions() {
    setLoading(true)
    setError(null)
    try {
      const res = await learningService.getSessions(userId)
      setSessions(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getAttempts() {
    setLoading(true)
    setError(null)
    try {
      const res = await learningService.getAttempts(userId)
      setAttempts(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getLetterDots() {
    const letter = (targetLetter || '').trim().toLowerCase()
    if (!letter) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/esp32/letter/${encodeURIComponent(letter)}`)
      setStep((prev) => ({ ...(prev || {}), target_dots: res?.dots }))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row">
      <div className="card">
        <h1>Learning Engine</h1>
        <div className="srOnly" aria-live="polite" aria-atomic="true">
          {loading ? 'Loading learning data' : attempt ? 'Attempt recorded' : step ? 'New step loaded' : ''}
        </div>
        <ErrorBanner error={typeof error === 'string' ? error : error?.message || JSON.stringify(error)} />

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Step</h2>
          <Field label="user id" id="learning-user-id" required>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="kid_01" />
          </Field>
          <Field label="available letters" id="learning-available-letters" hint="Separate letters with spaces or commas" required>
            <textarea value={availableLettersText} onChange={(e) => setAvailableLettersText(e.target.value)} />
          </Field>
          <small className="muted">Parsed letters: {availableLetters.join(', ') || '—'}</small>
          <div className="btnRow" style={{ marginTop: 10 }}>
            <button onClick={getStep} disabled={loading || !userId.trim() || availableLetters.length === 0}>
              Get /api/learning/step
            </button>
            <button className="secondary" onClick={getStats} disabled={loading || !userId.trim()}>
              Get stats
            </button>
            <button className="secondary" onClick={getSessions} disabled={loading || !userId.trim()}>
              Get sessions
            </button>
            <button className="secondary" onClick={getAttempts} disabled={loading || !userId.trim()}>
              Get attempts
            </button>
            <button className="danger" onClick={resetProgress} disabled={loading || !userId.trim()}>
              Reset progress
            </button>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <h2>Next Letter</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 42, fontWeight: 700 }}>{step?.next_letter ?? '—'}</div>
                <div>
                  <small className="muted">Reason: {typeof step?.reason === 'string' ? step?.reason : step?.reason?.message || '—'}</small>
                </div>
              </div>
            </div>
            <div>
              <h2>Dots (optional)</h2>
              <div className="btnRow">
                <button className="secondary" onClick={getLetterDots} disabled={loading || !targetLetter.trim()}>
                  Fetch dots for target
                </button>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
                <div>
                  <small className="muted">/api/esp32/letter</small>
                  <DotsView dots={step?.target_dots} />
                </div>
                {/* esp32_dots removed */}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Attempt</h2>
          <Field label="target letter" id="learning-target-letter" required>
            <input value={targetLetter} onChange={(e) => setTargetLetter(e.target.value)} placeholder="a" />
          </Field>
          <Field label="spoken letter" id="learning-spoken-letter" required>
            <input value={spokenLetter} onChange={(e) => setSpokenLetter(e.target.value)} placeholder="a" />
          </Field>
          <Field label="response time (seconds)" id="learning-response-time" required>
            <input value={responseTime} onChange={(e) => setResponseTime(e.target.value)} type="number" min="0" max="300" step="0.1" />
          </Field>
          <Field label="session id" id="learning-session-id" hint="Optional">
            <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="" />
          </Field>
          <div className="btnRow">
            <button onClick={recordAttempt} disabled={loading || !userId.trim() || !targetLetter.trim() || !spokenLetter.trim()}>
              Post /api/learning/attempt
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Responses</h2>
        <h3>Step</h3>
        <JsonView value={step} label="Learning step response" />
        <h3>Attempt</h3>
        <JsonView value={attempt} label="Learning attempt response" />
        <h3>Stats</h3>
        <JsonView value={stats} label="Learning stats response" />
        <h3>Sessions</h3>
        <JsonView value={sessions} label="Learning sessions response" />
        <h3>Attempts History</h3>
        <JsonView value={attempts} label="Learning attempts history response" />
      </div>
    </div>
  )
}
