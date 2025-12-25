import { NavLink } from 'react-router-dom'

function TabLink({ to, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${isActive
          ? 'bg-surface-soft text-text border-surface-border shadow-sm'
          : 'text-text-muted border-transparent hover:bg-surface-soft/40 hover:text-text'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function AppShell({ user, onLogout, children }) {
  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/20 selection:text-primary">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-primary text-background font-bold rounded-lg shadow-lg">
        Skip to content
      </a>
      <header className="flex items-center justify-between px-6 py-4 bg-surface/50 border-b border-surface-border backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-30 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 grid place-items-center text-primary font-bold shadow-inner border border-surface-border">
            <img src="/logo.png" alt="DotSense Logo" className="w-30 h-14 object-full" />
          </div>
          <div>
            {/* <div className="font-extrabold text-lg tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Dot
            </div>
            <div className="text-xs text-text-muted font-medium tracking-wide uppercase mt-0.5">
              Sense
            </div> */}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface-soft/50 border border-surface-border/50">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-secondary grid place-items-center text-background font-bold text-xs">
              {user?.name ? user.name[0]?.toUpperCase() : 'U'}
            </div>
            <span className="text-sm font-bold pr-2">{user?.name || 'User'}</span>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-surface-border text-text-muted hover:text-text hover:bg-surface-soft hover:border-text-muted/30 transition-all"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="sticky top-[73px] z-40 bg-background/80 backdrop-blur-md border-b border-surface-border">
        <nav className="max-w-6xl mx-auto px-6 py-2 overflow-x-auto">
          <div className="flex gap-2">
            <TabLink to="/home" label="Dashboard" />
            <TabLink to="/tutorial" label="Tutorial" />
            <TabLink to="/learn" label="Practice" />
            <TabLink to="/stats" label="Progress" />
          </div>
        </nav>
      </div>

      <main className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 focus:outline-none" id="main" tabIndex={-1} role="main">
        {children}
      </main>
    </div>
  )
}
