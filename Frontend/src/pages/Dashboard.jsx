import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const tips = [
  'Practice short sessions daily to build muscle memory.',
  'Say the letter out loud while feeling the dots to connect senses.',
  'If you make a mistake, slow down and trace each dot again.',
]

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], [])

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-lg text-text-muted">Currently mastering Braille Level 1</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          className="group relative overflow-hidden text-left p-8 rounded-3xl bg-surface border border-surface-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          onClick={() => navigate('/tutorial')}
        >
          <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-soft border border-surface-border grid place-items-center text-2xl mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              🎓
            </div>
            <div>
              <div className="text-xs font-bold text-primary tracking-wider uppercase mb-1">Guided Practice</div>
              <h2 className="text-2xl font-bold text-text mb-2">Tutorial Mode</h2>
              <p className="text-text-muted leading-relaxed">Learn each Braille letter with step-by-step audio guidance and visual aids.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              Start Tutorial <span>→</span>
            </div>
          </div>
        </button>

        <button
          className="group relative overflow-hidden text-left p-8 rounded-3xl bg-surface border border-surface-border hover:border-secondary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          onClick={() => navigate('/learn')}
        >
          <div className="absolute top-0 right-0 p-32 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-colors" />

          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-soft border border-surface-border grid place-items-center text-2xl mb-2 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold text-secondary tracking-wider uppercase mb-1">Adaptive Drills</div>
              <h2 className="text-2xl font-bold text-text mb-2">Learning Mode</h2>
              <p className="text-text-muted leading-relaxed">Speak the letter you see (or feel). Track your accuracy and build your streak.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-bold text-secondary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              Start Practice <span>→</span>
            </div>
          </div>
        </button>
      </div>

      <button
        className="group w-full text-left p-6 rounded-2xl bg-surface border border-surface-border hover:border-accent-amber/30 hover:bg-surface-soft transition-all duration-300 relative overflow-hidden"
        onClick={() => navigate('/stats')}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-amber/10 text-accent-amber grid place-items-center font-bold text-xl">
              📊
            </div>
            <div>
              <h3 className="text-lg font-bold text-text group-hover:text-accent-amber transition-colors">Your Progress & Stats</h3>
              <p className="text-text-muted text-sm">View detailed breakdown of mastered letters and session history</p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-surface-border bg-background/50 group-hover:bg-accent-amber group-hover:text-background group-hover:border-accent-amber transition-all duration-300">
            →
          </span>
        </div>
      </button>

      <div className="bg-accent-amber/5 border border-accent-amber/10 rounded-2xl p-4 flex gap-4 items-start" role="note">
        <span className="text-xl">💡</span>
        <div>
          <h4 className="font-bold text-accent-amber/90 text-sm uppercase tracking-wide mb-1">Daily Tip</h4>
          <p className="text-accent-amber/80 text-sm">{tip}</p>
        </div>
      </div>
    </div>
  )
}
