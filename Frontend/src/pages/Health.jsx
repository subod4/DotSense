import { useState } from 'react'
import { api } from '../api/client.js'
import JsonView from '../components/JsonView.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

export default function Health() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/health')
      setData(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h1>Health</h1>
      <div className="btnRow">
        <button onClick={run} disabled={loading} aria-busy={loading}>
          {loading ? 'Loading…' : 'Check /api/health'}
        </button>
      </div>
      <div className="srOnly" aria-live="polite" aria-atomic="true">
        {loading ? 'Loading health status' : data ? 'Health status loaded' : ''}
      </div>
      <ErrorBanner error={error} />
      <JsonView value={data} label="Health endpoint response" />
    </div>
  )
}
