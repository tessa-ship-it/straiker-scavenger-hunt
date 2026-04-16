import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone

  useEffect(() => {
    if (isInStandaloneMode) { setIsInstalled(true); return }
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  return { deferredPrompt, isInstalled, isIOS, isInStandaloneMode }
}

export default function RegisterPage({ onRegister }) {
  const { settings } = useSettings()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showIOSHint, setShowIOSHint] = useState(false)
  const { deferredPrompt, isInstalled, isIOS, isInStandaloneMode } = useInstallPrompt()

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } else if (isIOS) {
      setShowIOSHint(true)
    }
  }

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
      {!isInstalled && !isInStandaloneMode && (deferredPrompt || isIOS) && (
        <div className="install-banner">
          <span>📲 Add to your home screen for the best experience</span>
          <button onClick={handleInstall} className="install-btn">Install App</button>
        </div>
      )}
      {showIOSHint && (
        <div className="ios-hint" onClick={() => setShowIOSHint(false)}>
          <div className="ios-hint-box">
            <p>To install on iPhone/iPad:</p>
            <ol>
              <li>Tap the <strong>Share</strong> button <span style={{fontSize:'1.2em'}}>⎋</span> in Safari</li>
              <li>Tap <strong>"Add to Home Screen"</strong></li>
            </ol>
            <button className="install-btn" onClick={() => setShowIOSHint(false)}>Got it</button>
          </div>
        </div>
      )}
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
