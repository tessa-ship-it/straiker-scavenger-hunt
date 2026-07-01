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
  const [step, setStep] = useState('email') // 'email' | 'returning' | 'new'
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [existingPlayer, setExistingPlayer] = useState(null)
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

  // Step 1: check if email exists
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const { data: existing } = await supabase
        .from('players')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (existing) {
        setExistingPlayer(existing)
        setStep('returning')
      } else {
        setStep('new')
      }
    } catch (err) {
      setError('Could not connect. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Step 2a: returning player — verify PIN or set one if missing
  const handleReturningSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // No PIN set yet — save the new one then log in
    if (!existingPlayer.pin) {
      if (!/^\d{4}$/.test(newPin)) { setError('PIN must be exactly 4 digits.'); return }
      if (newPin !== confirmPin) { setError('PINs do not match.'); return }
      const { error: updateErr } = await supabase
        .from('players')
        .update({ pin: newPin })
        .eq('id', existingPlayer.id)
      if (updateErr) { setError('Could not save PIN. Try again.'); return }
      onRegister({ ...existingPlayer, pin: newPin })
      return
    }

    // Has PIN — verify it
    if (pin !== existingPlayer.pin) {
      setError('Incorrect PIN. Try again.')
      return
    }
    onRegister(existingPlayer)
  }

  // Step 2b: new player — register with PIN
  const handleNewSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.')
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const fullName = `${firstName.trim()} ${lastName.trim()}`

      const { data, error: insertError } = await supabase
        .from('players')
        .insert([{
          name: fullName,
          email: normalizedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          job_title: jobTitle.trim() || null,
          company_name: companyName.trim() || null,
          pin: newPin,
        }])
        .select()
        .single()

      if (insertError) throw insertError
      onRegister(data)
    } catch (err) {
      setError('Could not connect. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const Header = () => (
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
  )

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
        <Header />

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="register-form">
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
                autoFocus
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'CHECKING...' : 'CONTINUE'}
            </button>
          </form>
        )}

        {/* Step 2a: Returning player */}
        {step === 'returning' && (
          <form onSubmit={handleReturningSubmit} className="register-form">
            <p className="register-note" style={{ marginBottom: '1rem', color: 'var(--teal)' }}>
              Welcome back, {existingPlayer?.first_name || existingPlayer?.name}!
            </p>

            {!existingPlayer?.pin ? (
              <>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Create a 4-digit PIN to secure your account.
                </p>
                <div className="register-row">
                  <div className="form-group">
                    <label>CREATE PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 digits"
                      required
                      autoFocus
                      style={{ textAlign: 'center', letterSpacing: '0.3em' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>CONFIRM PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 digits"
                      required
                      style={{ textAlign: 'center', letterSpacing: '0.3em' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label htmlFor="pin">ENTER YOUR 4-DIGIT PIN</label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                  autoFocus
                  style={{ letterSpacing: '0.5em', fontSize: '1.5rem', textAlign: 'center' }}
                />
              </div>
            )}

            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary">
              {!existingPlayer?.pin ? 'SET PIN & ENTER' : 'RESUME MISSION'}
            </button>
            <button type="button" className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => { setStep('email'); setPin(''); setNewPin(''); setConfirmPin(''); setError('') }}>
              ← BACK
            </button>
          </form>
        )}

        {/* Step 2b: New player */}
        {step === 'new' && (
          <form onSubmit={handleNewSubmit} className="register-form">
            <div className="register-row">
              <div className="form-group">
                <label htmlFor="firstName">FIRST NAME</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" required autoComplete="given-name" autoFocus />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">LAST NAME</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" required autoComplete="family-name" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="jobTitle">JOB TITLE</label>
              <input id="jobTitle" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Security Engineer" required autoComplete="organization-title" />
            </div>

            <div className="form-group">
              <label htmlFor="companyName">COMPANY</label>
              <input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" required autoComplete="organization" />
            </div>

            <div className="register-row">
              <div className="form-group">
                <label htmlFor="newPin">CREATE PIN</label>
                <input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="4 digits"
                  required
                  style={{ textAlign: 'center', letterSpacing: '0.3em' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPin">CONFIRM PIN</label>
                <input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="4 digits"
                  required
                  style={{ textAlign: 'center', letterSpacing: '0.3em' }}
                />
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'DEPLOYING...' : 'BEGIN MISSION'}
            </button>
            <button type="button" className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => { setStep('email'); setError('') }}>
              ← BACK
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
