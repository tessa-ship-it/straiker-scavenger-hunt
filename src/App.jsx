import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import RegisterPage from './pages/RegisterPage'
import MissionsPage from './pages/MissionsPage'
import MissionPage from './pages/MissionPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import Nav from './components/Nav'

export default function App() {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('straiker_player')
    if (stored) {
      try {
        setPlayer(JSON.parse(stored))
      } catch {
        localStorage.removeItem('straiker_player')
      }
    }
    setLoading(false)
  }, [])

  const handleRegister = (playerData) => {
    localStorage.setItem('straiker_player', JSON.stringify(playerData))
    setPlayer(playerData)
  }

  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname === '/settings'

  return (
    <SettingsProvider>
      {loading ? (
        <div className="loading-screen">
          <div className="loading-pulse">INITIALIZING...</div>
        </div>
      ) : !player && !isAdminRoute ? (
        <RegisterPage onRegister={handleRegister} />
      ) : (
        <BrowserRouter>
          <div className="app-shell">
            <Routes>
              <Route path="/" element={player ? <MissionsPage player={player} /> : <RegisterPage onRegister={handleRegister} />} />
              <Route path="/mission/:id" element={<MissionPage player={player} />} />
              <Route path="/leaderboard" element={<LeaderboardPage player={player} />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {player && <Nav />}
          </div>
        </BrowserRouter>
      )}
    </SettingsProvider>
  )
}
