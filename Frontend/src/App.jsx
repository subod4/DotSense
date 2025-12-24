import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

import AppShell from './components/AppShell.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import TutorialMode from './pages/TutorialMode.jsx'
import LearningMode from './pages/LearningMode.jsx'
import Stats from './pages/Stats.jsx'

export default function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('brailleUser')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure user has an ID, otherwise invalid
      if (parsed && parsed.id) return parsed
    }
    return null
  })

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 650)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('brailleUser', JSON.stringify(user))
    } else {
      localStorage.removeItem('brailleUser')
    }
  }, [user])

  function handleLogin(name, age, userId) {
    if (!userId) {
      console.error('Login attempt without user ID:', { name, age, userId })
      throw new Error('User ID missing from server response.')
    }
    const profile = {
      id: userId,
      name,
      age: age || undefined,
      level: 'Explorer',
    }
    setUser(profile)
  }

  function handleLogout() {
    setUser(null)
  }

  if (booting) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/register" element={<Register onRegister={handleLogin} />} />

      <Route
        element={
          user ? (
            <ProtectedLayout user={user} onLogout={handleLogout}>
              <Outlet />
            </ProtectedLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Dashboard user={user} />} />
        <Route
          path="/tutorial"
          element={<TutorialMode userId={user?.id} />}
        />
        <Route path="/learn" element={<LearningMode user={user} />} />
        <Route path="/stats" element={<Stats user={user} />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
    </Routes>
  )
}

function ProtectedLayout({ user, onLogout, children }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      {children}
    </AppShell>
  )
}
