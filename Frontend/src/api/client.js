function joinUrl(baseUrl, path) {
  const base = (baseUrl || '').replace(/\/+$/, '')
  const p = (path || '').startsWith('/') ? path : `/${path || ''}`
  return `${base}${p}`
}

async function readJsonSafe(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export class ApiError extends Error {
  constructor(message, { status, data, url } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.url = url
  }
}

function resolveBaseUrl(explicitBaseUrl) {
  const resolved = explicitBaseUrl || import.meta.env.VITE_API_URL
  if (!resolved) {
    throw new ApiError('API base URL not configured', {
      status: 500,
      data: { detail: 'Set VITE_API_URL in frontend/.env' },
    })
  }
  return resolved
}

export function createApiClient({ baseUrl } = {}) {
  const resolvedBaseUrl = resolveBaseUrl(baseUrl)

  async function request(path, { method = 'GET', query, body } = {}) {
    const urlObj = new URL(joinUrl(resolvedBaseUrl, path))
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        urlObj.searchParams.set(k, String(v))
      })
    }

    const res = await fetch(urlObj.toString(), {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : null),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await readJsonSafe(res)
    if (!res.ok) {
      const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : data
      const message = typeof detail === 'string' ? detail : `Request failed (${res.status})`
      throw new ApiError(message, { status: res.status, data, url: urlObj.toString() })
    }

    return data
  }

  return {
    baseUrl: resolvedBaseUrl,
    get: (path, opts) => request(path, { ...opts, method: 'GET' }),
    post: (path, opts) => request(path, { ...opts, method: 'POST' }),
    put: (path, opts) => request(path, { ...opts, method: 'PUT' }),
    del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  }
}

export const api = createApiClient()
