import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { learningService } from '../api/services.js'

export default function Stats({ user }) {
  const navigate = useNavigate()
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [showAllAttempts, setShowAllAttempts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statsData, setStatsData] = useState(null)
  const [sessionsData, setSessionsData] = useState([])
  const [attemptsData, setAttemptsData] = useState([])

  useEffect(() => {
    if (user?.id) {
      loadStats()
    } else {
      // No user, stop loading
      setLoading(false)
    }
  }, [user])

  async function loadStats() {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // Load all data in parallel
      const [stats, sessions, attempts] = await Promise.all([
        learningService.getStats(user.id),
        learningService.getSessions(user.id, 10),
        learningService.getAttempts(user.id, 20),
      ])

      setStatsData(stats)
      setSessionsData(sessions || [])
      setAttemptsData(attempts || [])
    } catch (err) {
      console.error('Error loading stats:', err)
      setError('Failed to load statistics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!statsData) {
      return {
        accuracy: 0,
        streak: { current: 0, best: 0 },
        attempts: { total: 0, correct: 0 },
        timeSpent: { minutes: 0, sessions: 0 },
        activity: { recent: 0, correct: 0 },
        level: 'Beginner',
      }
    }

    const accuracy = Math.round((statsData.overall_accuracy || 0) * 100)
    const totalAttempts = statsData.total_attempts || 0
    const correctAttempts = Math.round(totalAttempts * (statsData.overall_accuracy || 0))

    return {
      accuracy,
      streak: {
        current: statsData.current_streak || 0,
        best: statsData.best_streak || 0
      },
      attempts: {
        total: totalAttempts,
        correct: correctAttempts
      },
      timeSpent: {
        minutes: Math.round((statsData.total_time || 0) / 60),
        sessions: statsData.sessions_count || 0
      },
      activity: {
        recent: statsData.recent_attempts || 0,
        correct: statsData.recent_correct || 0
      },
      level: statsData.level || 'Beginner',
    }
  }, [statsData])

  const lettersByMastery = useMemo(() => {
    if (!statsData?.letter_mastery) {
      return { mastered: [], learning: [], practice: [] }
    }

    const mastered = []
    const learning = []
    const practice = []

    Object.entries(statsData.letter_mastery).forEach(([letter, mastery]) => {
      if (mastery >= 0.85) {
        mastered.push(letter)
      } else if (mastery >= 0.6) {
        learning.push(letter)
      } else if (mastery > 0) {
        practice.push(letter)
      }
    })

    return { mastered, learning, practice }
  }, [statsData])

  // Format sessions for display
  const formattedSessions = useMemo(() => {
    if (!sessionsData || sessionsData.length === 0) {
      return []
    }

    return sessionsData.map((session) => {
      const type = session.session_type || 'Practice'
      const duration = session.duration_minutes || 0
      const accuracy = session.accuracy || 0
      const letters = session.letters_count || 0
      return {
        id: session.id,
        title: `${type} Session`,
        details: `${duration} min • ${letters} letters`,
        value: `${accuracy}% Accuracy`
      }
    })
  }, [sessionsData])

  // Format attempts for display
  const formattedAttempts = useMemo(() => {
    if (!attemptsData || attemptsData.length === 0) {
      return []
    }

    return attemptsData.map((attempt) => {
      const letter = attempt.letter?.toUpperCase() || '?'
      const isCorrect = attempt.is_correct
      const spokenLetter = attempt.spoken_letter?.toUpperCase() || '?'

      return {
        id: attempt.id,
        letter,
        isCorrect,
        spoken: spokenLetter,
        time: new Date(attempt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    })
  }, [attemptsData])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-surface-border border-t-primary animate-spin" />
          <p className="text-text-muted">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (!user?.id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-surface border border-surface-border text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-surface-soft grid place-items-center text-3xl mx-auto">🔒</div>
          <div>
            <h2 className="text-xl font-bold mb-2">Please log in</h2>
            <p className="text-text-muted">You need an account to view your statistics and progress.</p>
          </div>
          <button
            className="w-full px-6 py-3 rounded-xl font-bold bg-primary text-background hover:bg-primary/90 transition-colors"
            onClick={() => navigate('/login')}
          >
            Log In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {error && (
        <div className="p-4 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20 flex gap-2 items-center" role="alert">
          <span>⚠️</span>
          {error}
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-surface-border">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent-amber">Your Learning Progress</h1>
          <div className="flex gap-3 text-sm font-medium text-text-muted">
            <span className="px-3 py-1 rounded-full bg-surface-soft border border-surface-border">{stats.timeSpent.sessions} sessions</span>
            <span className="px-3 py-1 rounded-full bg-surface-soft border border-surface-border">{stats.attempts.total} attempts</span>
            <span className="px-3 py-1 rounded-full bg-surface-soft border border-surface-border text-primary">{stats.level}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-xl text-sm font-medium bg-surface-soft text-text-muted hover:text-text hover:bg-surface border border-surface-border transition-colors"
            onClick={loadStats}
          >
            ↻ Reload
          </button>
          <button
            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-background hover:bg-primary/90 transition-colors"
            onClick={() => navigate('/home')}
          >
            Home
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Overall Accuracy" value={`${stats.accuracy}%`} icon="target" />
        <StatCard title="Current Streak" value={stats.streak.current} subtitle={`Best ${stats.streak.best}`} icon="fire" />
        <StatCard title="Total Attempts" value={stats.attempts.total} subtitle={`${stats.attempts.correct} correct`} icon="zap" />
        <StatCard title="Time Spent" value={`${stats.timeSpent.minutes} min`} subtitle={`${stats.timeSpent.sessions} sessions`} icon="clock" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Progress Overview</h3>
                <div className="text-2xl font-bold mt-1">Letters mastered: <span className="text-primary">{lettersByMastery.mastered.length}</span></div>
              </div>
              <div className="text-right text-xs font-medium text-text-muted">
                <div>Recent activity: {stats.activity.recent}</div>
                <div>Correct: {stats.activity.correct}</div>
              </div>
            </div>

            <div className="h-4 bg-surface-soft rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out relative"
                style={{ width: `${Math.min(100, (lettersByMastery.mastered.length / 26) * 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <h3 className="font-bold text-lg mb-4">Letters Mastered</h3>
              <div className="flex flex-wrap gap-2">
                {lettersByMastery.mastered.length > 0 ? (
                  lettersByMastery.mastered.map((l) => (
                    <span key={l} className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg">
                      {l}
                    </span>
                  ))
                ) : (
                  <p className="text-text-muted italic text-sm">No letters mastered yet. Keep practicing!</p>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <h3 className="font-bold text-lg mb-4">In Progress</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-text-muted uppercase">Learning</div>
                  <div className="flex flex-wrap gap-2">
                    {lettersByMastery.learning.length > 0 ? (
                      lettersByMastery.learning.map((l) => (
                        <span key={l} className="w-10 h-10 rounded-xl bg-surface-soft text-text border border-surface-border flex items-center justify-center font-medium">
                          {l}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted text-xs italic">None</span>
                    )}
                  </div>
                </div>

                {lettersByMastery.practice.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-accent-danger uppercase">Needs Work</div>
                    <div className="flex flex-wrap gap-2">
                      {lettersByMastery.practice.map((l) => (
                        <span key={l} className="w-10 h-10 rounded-xl bg-accent-danger/10 text-accent-danger border border-accent-danger/20 flex items-center justify-center font-bold">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ListSection
            title="Recent Sessions"
            items={formattedSessions}
            emptyMessage="No sessions yet."
            showAll={showAllSessions}
            onToggle={() => setShowAllSessions((v) => !v)}
            type="session"
          />
          <ListSection
            title="Recent Attempts"
            items={formattedAttempts}
            emptyMessage="No attempts yet."
            showAll={showAllAttempts}
            onToggle={() => setShowAllAttempts((v) => !v)}
            type="attempt"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon }) {
  const icons = {
    target: '🎯',
    fire: '🔥',
    zap: '⚡',
    clock: '⏱️'
  }

  return (
    <div className="p-6 rounded-3xl bg-surface border border-surface-border hover:border-surface-border/80 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-12 bg-surface-soft/50 rounded-full blur-2xl group-hover:bg-primary/5 transition-colors" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">{title}</div>
          <div className="text-xl opacity-50">{icons[icon]}</div>
        </div>
        <div className="text-3xl font-black text-text mb-1">{value}</div>
        {subtitle && <div className="text-sm font-medium text-text-muted">{subtitle}</div>}
      </div>
    </div>
  )
}

function ListSection({ title, items, emptyMessage, showAll, onToggle, type }) {
  const visible = showAll ? items : items.slice(0, 5)
  const hasMore = items.length > 5

  return (
    <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{title}</h3>
        {hasMore && (
          <button className="text-xs font-bold text-primary hover:underline uppercase tracking-wider" onClick={onToggle}>
            {showAll ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((item, idx) => (
            <li key={item.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-surface-soft/50 border border-surface-border/50 text-sm">
              {type === 'session' ? (
                <>
                  <div>
                    <div className="font-bold">{item.title}</div>
                    <div className="text-xs text-text-muted">{item.details}</div>
                  </div>
                  <div className="font-bold text-primary">{item.value}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg grid place-items-center font-bold ${item.isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {item.letter}
                    </span>
                    <div className="flex flex-col">
                      <span className={item.isCorrect ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                        {item.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                      {!item.isCorrect && <span className="text-xs text-text-muted">Said "{item.spoken}"</span>}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted font-medium">{item.time}</div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center py-8 text-text-muted italic">{emptyMessage}</p>
      )}
    </div>
  )
}
