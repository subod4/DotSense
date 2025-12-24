import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userService } from '../api/services.js'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name to continue')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Fetch user from backend
      const user = await userService.getByUsername(name.trim())

      // Update local state - handle both 'id' and '_id' from backend
      onLogin(user.username, user.age, user.id || user._id)
      navigate('/home')
    } catch (err) {
      console.error('Login error:', err)
      if (err.status === 404) {
        setError('User not found. Please register first.')
      } else {
        setError(err.message || 'Failed to sign in. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg aspect-square bg-primary/20 rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-surface border border-surface-border shadow-2xl space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-500" role="form" aria-labelledby="login-title">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl text-white font-black mx-auto shadow-lg shadow-primary/20" aria-hidden="true">
            ⠿
          </div>
          <div>
            <h1 id="login-title" className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Welcome Back!</h1>
            <p className="text-text-muted mt-2">Continue your Braille learning journey</p>
          </div>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20 text-sm font-medium flex gap-2 items-center" role="alert">
            <span>⚠️</span>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block space-y-2" htmlFor="login-name">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider block ml-1">Name</span>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl group-focus-within:scale-110 transition-transform" aria-hidden="true">👤</span>
              <input
                id="login-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-soft border border-surface-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-text-muted/50 font-medium"
              />
            </div>
          </label>

          <button
            className="w-full py-4 rounded-xl font-bold bg-primary text-background hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm text-text-muted pt-4 border-t border-surface-border/50">
          <span>New here? </span>
          <Link to="/register" className="font-bold text-primary hover:text-primary-glow hover:underline underline-offset-4 decoration-2">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
