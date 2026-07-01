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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
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
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return

    setLoading(true)
    setError('')

    try {
      const normalizedEmail = email.toLowerCase().trim()
      const fullName = `${firstName.trim()} ${lastName.trim()}`

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
        .insert([{
          name: fullName,
          email: normalizedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          job_title: jobTitle.trim() || null,
          company_name: companyName.trim() || null,
        }])
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
          <div className="register-row">
            <div className="form-group">
              <label htmlFor="firstName">FIRST NAME</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                required
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">LAST NAME</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">EMAIL</label>
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

          <div className="form-group">
            <label htmlFor="jobTitle">JOB TITLE</label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Security Engineer"
              autoComplete="organization-title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="companyName">COMPANY</label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              autoComplete="organization"
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
