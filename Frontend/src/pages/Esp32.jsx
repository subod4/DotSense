import { useState } from 'react'
import { api } from '../api/client.js'
import Field from '../components/Field.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import JsonView from '../components/JsonView.jsx'
import DotsView from '../components/DotsView.jsx'

export default function Esp32() {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [letter, setLetter] = useState('a')
  const [userId, setUserId] = useState('')

  const [letterRes, setLetterRes] = useState(null)
  const [learningRes, setLearningRes] = useState(null)

  async function getLetter() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/esp32/letter/${encodeURIComponent(letter)}`)
      setLetterRes(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getLearningDots() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/esp32/learning/dots', { query: { user_id: userId } })
      setLearningRes(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row">
      <div className="card">
        <h1>ESP32 Endpoints</h1>
        <div className="srOnly" aria-live="polite" aria-atomic="true">
          {loading ? 'Loading ESP32 data' : letterRes || learningRes ? 'ESP32 response updated' : ''}
        </div>
        <ErrorBanner error={error} />

        <div className="card" style={{ marginTop: 12 }}>
          <h3>/api/esp32/letter/{'{letter}'}</h3>
          <Field label="letter (a-z)" id="esp32-letter" required>
            <input value={letter} onChange={(e) => setLetter(e.target.value)} />
          </Field>
          <div className="btnRow">
            <button onClick={getLetter} disabled={loading || !letter.trim()}>
              Get dots
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <DotsView dots={letterRes?.dots} />
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>/api/esp32/learning/dots</h3>
          <Field label="user id" id="esp32-user-id" required>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="kid_01" />
          </Field>
          <div className="btnRow">
            <button onClick={getLearningDots} disabled={loading || !userId.trim()}>
              Poll learning dots
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <DotsView dots={learningRes?.dots} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Raw Responses</h2>
        <h3>Letter</h3>
        <JsonView value={letterRes} label="ESP32 letter response" />
        <h3>Learning dots</h3>
        <JsonView value={learningRes} label="ESP32 learning dots response" />
      </div>
    </div>
  )
}
