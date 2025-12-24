import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import JsonView from '../components/JsonView.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

export default function Home() {
  const [rootInfo, setRootInfo] = useState(null)
  const [constants, setConstants] = useState(null)
  const [error, setError] = useState(null)

  const baseUrl = useMemo(() => api.baseUrl, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setError(null)
      try {
        const [r, c] = await Promise.all([api.get('/'), api.get('/api/constants')])
        if (cancelled) return
        setRootInfo(r)
        setConstants(c)
      } catch (e) {
        if (cancelled) return
        setError(e)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="row">
      <div className="card">
        <h1>Braille Learning API</h1>
        <small className="muted">Frontend base URL: {baseUrl}</small>
        <ErrorBanner error={error} />
        <h2>Root</h2>
        <JsonView value={rootInfo} label="Root endpoint response" />
      </div>
      <div className="card">
        <h2>Constants</h2>
        <small className="muted">From /api/constants</small>
        <JsonView value={constants} label="Constants response" />
      </div>
    </div>
  )
}
