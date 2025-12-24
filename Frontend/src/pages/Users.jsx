import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import Field from '../components/Field.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import JsonView from '../components/JsonView.jsx'

export default function Users() {
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [skip, setSkip] = useState(0)
  const [limit, setLimit] = useState(50)

  const [createUsername, setCreateUsername] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createFullName, setCreateFullName] = useState('')

  const [lookupId, setLookupId] = useState('')
  const [lookupUsername, setLookupUsername] = useState('')

  const [updateId, setUpdateId] = useState('')
  const [updateEmail, setUpdateEmail] = useState('')
  const [updateFullName, setUpdateFullName] = useState('')

  const [deleteId, setDeleteId] = useState('')

  const baseUrl = useMemo(() => api.baseUrl, [])

  async function loadList() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/users/', { query: { skip, limit } })
      setList(res || [])
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createUser() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/users/create', {
        body: {
          username: createUsername,
          email: createEmail || null,
          full_name: createFullName || null,
        },
      })
      setSelected(res)
      await loadList()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getById() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/users/${encodeURIComponent(lookupId)}`)
      setSelected(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function getByUsername() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/users/username/${encodeURIComponent(lookupUsername)}`)
      setSelected(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function updateUser() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.put(`/api/users/${encodeURIComponent(updateId)}`, {
        body: {
          email: updateEmail || null,
          full_name: updateFullName || null,
        },
      })
      setSelected(res)
      await loadList()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function deleteUser() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.del(`/api/users/${encodeURIComponent(deleteId)}`)
      setSelected(res)
      await loadList()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row">
      <div className="card">
        <h1>Users</h1>
        <small className="muted">API base URL: {baseUrl}</small>
        <div className="srOnly" aria-live="polite" aria-atomic="true">
          {loading ? 'Loading users data' : selected ? 'Result updated' : list?.length ? `Loaded ${list.length} users` : ''}
        </div>
        <ErrorBanner error={error} />

        <div className="card" style={{ marginTop: 12 }}>
          <h2>List</h2>
          <div className="btnRow">
            <button className="secondary" onClick={loadList} disabled={loading}>Refresh</button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="skip">
              <input value={skip} onChange={(e) => setSkip(Number(e.target.value || 0))} type="number" min="0" />
            </Field>
            <Field label="limit">
              <input value={limit} onChange={(e) => setLimit(Number(e.target.value || 0))} type="number" min="1" max="500" />
            </Field>
          </div>
          <JsonView value={list} label="Users list" />
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Create</h2>
          <Field label="username (required)">
            <input value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} placeholder="e.g. kid_01" />
          </Field>
          <Field label="email (optional)">
            <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="full_name (optional)">
            <input value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} placeholder="Full Name" />
          </Field>
          <div className="btnRow">
            <button onClick={createUser} disabled={loading}>Create</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Lookup</h2>
          <Field label="user_id">
            <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Mongo id" />
          </Field>
          <div className="btnRow">
            <button className="secondary" onClick={getById} disabled={loading}>Get by ID</button>
          </div>
          <Field label="username">
            <input value={lookupUsername} onChange={(e) => setLookupUsername(e.target.value)} placeholder="kid_01" />
          </Field>
          <div className="btnRow">
            <button className="secondary" onClick={getByUsername} disabled={loading}>Get by Username</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Update</h2>
          <Field label="user_id">
            <input value={updateId} onChange={(e) => setUpdateId(e.target.value)} placeholder="Mongo id" />
          </Field>
          <Field label="email">
            <input value={updateEmail} onChange={(e) => setUpdateEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="full_name">
            <input value={updateFullName} onChange={(e) => setUpdateFullName(e.target.value)} placeholder="Full Name" />
          </Field>
          <div className="btnRow">
            <button onClick={updateUser} disabled={loading}>Update</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2>Delete</h2>
          <Field label="user_id">
            <input value={deleteId} onChange={(e) => setDeleteId(e.target.value)} placeholder="Mongo id" />
          </Field>
          <div className="btnRow">
            <button className="danger" onClick={deleteUser} disabled={loading}>Delete</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Result</h2>
        <small className="muted">Last response</small>
        <JsonView value={selected} label="Selected user result" />
      </div>
    </div>
  )
}
