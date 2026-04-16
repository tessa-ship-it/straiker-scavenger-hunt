import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'

export default function RegisterPage({ onRegister }) {
  const { settings } = useSettings()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setLoading(true)
    setError('')

    try {
      const normalizedEmail = email.toLowerCase().trim()

      // Check for existing player first
      const { data: existing } = await supabase
        .from('players')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (existing) {
        onRegister(existing)
        return
      }

      // Create new player
      const { data, error: insertError } = await supabase
        .from('players')
        .insert([{ name: name.trim(), email: normalizedEmail }])
        .select()
        .single()

      if (insertError) throw insertError
      onRegister(data)
    } catch (err) {
      setError('Could not connect. Check your .env keys and Supabase setup.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-bg">
      <div className="register-card">
        <div className="register-header">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="register-brand-logo" />
          ) : (
            <div className="register-logo">📡</div>
          )}
          <h1 className="register-title">{settings.app_title}</h1>
          <p className="register-sub">{settings.app_subtitle}</p>
          <div className="register-divider" />
          <p className="register-tagline">{settings.app_tagline}</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">OPERATIVE NAME</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">SIGNAL ADDRESS</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'DEPLOYING...' : 'BEGIN MISSION'}
          </button>
        </form>

        <p className="register-note">
          Already registered? Enter the same email to resume your mission.
        </p>
      </div>
    </div>
  )
}
