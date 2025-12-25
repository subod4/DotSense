import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userService } from '../api/services.js'

export default function Register({ onRegister }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    const ageValue = Number(age)
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!ageValue || ageValue < 3 || ageValue > 100) {
      setError('Age must be between 3 and 100')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Create user in backend
      const user = await userService.create({
        username: name.trim(),
        age: ageValue
      })

      // Update local state - handle both 'id' and '_id' from backend
      onRegister(user.username, user.age, user.id || user._id)
      navigate('/home')
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg aspect-square bg-secondary/20 rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-surface border border-surface-border shadow-2xl space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-500" role="form" aria-labelledby="register-title">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-3xl text-white font-black mx-auto shadow-lg shadow-secondary/20" aria-hidden="true">
            ⠿
          </div>
          <div>
            <h1 id="register-title" className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-secondary to-primary">Start Learning!</h1>
            <p className="text-text-muted mt-2">Create your account to begin your Braille journey</p>
          </div>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20 text-sm font-medium flex gap-2 items-center" role="alert">
            <span>⚠️</span>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block space-y-2" htmlFor="register-name">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider block ml-1">Name</span>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl group-focus-within:scale-110 transition-transform" aria-hidden="true">👤</span>
              <input
                id="register-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-soft border border-surface-border focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all outline-none placeholder:text-text-muted/50 font-medium"
              />
            </div>
          </label>

          <label className="block space-y-2" htmlFor="register-age">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider block ml-1">Age</span>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl group-focus-within:scale-110 transition-transform" aria-hidden="true">🎂</span>
              <input
                id="register-age"
                name="age"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age 3–100"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-soft border border-surface-border focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all outline-none placeholder:text-text-muted/50 font-medium"
              />
            </div>
          </label>

          <button
            className="w-full py-4 rounded-xl font-bold bg-secondary text-background hover:bg-secondary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="text-center text-sm text-text-muted pt-4 border-t border-surface-border/50">
          <span>Already have an account? </span>
          <Link to="/login" className="font-bold text-secondary hover:text-secondary/80 hover:underline underline-offset-4 decoration-2">Sign in</Link>
        </div>
      </div>
    </div>
  )
}