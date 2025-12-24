import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import Field from '../components/Field.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import JsonView from '../components/JsonView.jsx'
import DotsView from '../components/DotsView.jsx'

export default function Tutorial() {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [userId, setUserId] = useState('')
  const [tutorialId, setTutorialId] = useState('')
  const [step, setStep] = useState(null)

  const [jumpLetter, setJumpLetter] = useState('a')

  async function start() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/tutorial/start', { body: { user_id: userId } })
      setTutorialId(res.tutorial_id)
      setStep(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function refreshStep() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/tutorial/step', { query: { tutorial_id: tutorialId } })
      setStep(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function control(action) {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/api/tutorial/${action}`, { body: { tutorial_id: tutorialId } })
      setStep(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function jump() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/tutorial/jump', { query: { tutorial_id: tutorialId, letter: jumpLetter } })
      setStep(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function end() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/tutorial/end', { body: { tutorial_id: tutorialId } })
      setStep(res)
      setTutorialId('')
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  // If tutorialId is manually pasted, allow quick refresh.
  useEffect(() => {
    setError(null)
  }, [tutorialId])

  return (
    <div className="row">
      <div className="card">
        <h1>Tutorial Mode</h1>
        <div className="srOnly" aria-live="polite" aria-atomic="true">
          {loading ? 'Loading tutorial data' : step ? 'Tutorial step updated' : ''}
        </div>
        <ErrorBanner error={error} />

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Start</h2>
          <Field label="user id" id="tutorial-user-id" required>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="any id (e.g. kid_01)" />
          </Field>
          <div className="btnRow">
            <button onClick={start} disabled={loading || !userId.trim()}>
              Start tutorial
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Session</h2>
          <Field label="tutorial id" id="tutorial-id" required>
            <input value={tutorialId} onChange={(e) => setTutorialId(e.target.value)} placeholder="uuid" />
          </Field>
          <div className="btnRow">
            <button className="secondary" onClick={refreshStep} disabled={loading || !tutorialId.trim()}>
              Get current step
            </button>
            <button className="secondary" onClick={() => control('previous')} disabled={loading || !tutorialId.trim()}>
              Previous
            </button>
            <button className="secondary" onClick={() => control('repeat')} disabled={loading || !tutorialId.trim()}>
              Repeat
            </button>
            <button className="secondary" onClick={() => control('next')} disabled={loading || !tutorialId.trim()}>
              Next
            </button>
            <button className="danger" onClick={end} disabled={loading || !tutorialId.trim()}>
              End
            </button>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <Field label="jump letter (a-z)" id="tutorial-jump-letter" required>
                <input value={jumpLetter} onChange={(e) => setJumpLetter(e.target.value)} placeholder="a" />
              </Field>
              <div className="btnRow">
                <button className="secondary" onClick={jump} disabled={loading || !tutorialId.trim()}>
                  Jump
                </button>
              </div>
            </div>
            <div>
              <h2>Dots</h2>
              <DotsView dots={step?.dots} />
              <div style={{ marginTop: 8 }}>
                <small className="muted">Letter: {step?.letter ?? '—'}</small>
              </div>
              <div style={{ marginTop: 8 }}>
                <small className="muted">Spoken: {step?.spoken_text ?? '—'}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Raw Response</h2>
        <JsonView value={step} label="Tutorial raw response" />
      </div>
    </div>
  )
}
