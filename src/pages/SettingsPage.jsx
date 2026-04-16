import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings, DEFAULTS } from '../context/SettingsContext'

export default function SettingsPage() {
  const { settings, updateMany } = useSettings()

  const [authed, setAuthed]     = useState(false)
  const [pw, setPw]             = useState('')
  const [pwError, setPwError]   = useState(false)

  const [form, setForm]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [error, setError]       = useState('')
  const logoInputRef            = useRef(null)

  const handleLogin = (e) => {
    e.preventDefault()
    if (pw === settings.admin_password) {
      setAuthed(true)
      setForm({ ...settings })
    } else {
      setPwError(true)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoUploading(true)
    setError('')
    try {
      const ext  = file.name.split('.').pop()
      const path = `logo/brand-logo.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('mission-photos')
        .upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('mission-photos').getPublicUrl(path)
      setForm((f) => ({ ...f, logo_url: data.publicUrl }))
    } catch (err) {
      setError('Logo upload failed: ' + err.message)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateMany(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm({ ...settings, accent_color: DEFAULTS.accent_color, bg_color: DEFAULTS.bg_color, surface_color: DEFAULTS.surface_color })
  }

  // ── Password screen ──────────────────────────────────
  if (!authed) {
    return (
      <div className="register-bg">
        <div className="register-card">
          <div className="register-header">
            <div className="register-logo">🎨</div>
            <h1 className="register-title" style={{ fontSize: '1.5rem' }}>APPEARANCE</h1>
            <p className="register-sub">SETTINGS PANEL</p>
          </div>
          <form onSubmit={handleLogin} className="register-form">
            <div className="form-group">
              <label>ADMIN PASSWORD</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setPwError(false) }}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {pwError && <div className="error-msg">Incorrect password.</div>}
            <button type="submit" className="btn-primary">ENTER</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div>
          <h2>APPEARANCE</h2>
          <p className="text-muted">Customise the app for your event</p>
        </div>
      </div>

      <form onSubmit={handleSave}>

        {/* ── Logo ── */}
        <div className="settings-section">
          <h3 className="settings-section-title">// LOGO</h3>

          <div className="logo-preview-area">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo preview" className="logo-preview-img" />
            ) : (
              <div className="logo-preview-empty">No logo uploaded</div>
            )}
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
          >
            {logoUploading ? 'UPLOADING...' : form.logo_url ? 'REPLACE LOGO' : 'UPLOAD LOGO'}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
          {form.logo_url && (
            <button
              type="button"
              className="admin-btn-delete"
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem' }}
              onClick={() => setForm((f) => ({ ...f, logo_url: '' }))}
            >
              REMOVE LOGO
            </button>
          )}
        </div>

        {/* ── Text ── */}
        <div className="settings-section">
          <h3 className="settings-section-title">// APP TEXT</h3>

          <div className="form-group">
            <label>APP TITLE</label>
            <input
              type="text"
              value={form.app_title}
              onChange={(e) => setForm((f) => ({ ...f, app_title: e.target.value }))}
              placeholder="Straiker: Signal Detection"
            />
          </div>
          <div className="form-group">
            <label>SUBTITLE</label>
            <input
              type="text"
              value={form.app_subtitle}
              onChange={(e) => setForm((f) => ({ ...f, app_subtitle: e.target.value }))}
              placeholder="SIGNAL DETECTION"
            />
          </div>
          <div className="form-group">
            <label>TAGLINE</label>
            <input
              type="text"
              value={form.app_tagline}
              onChange={(e) => setForm((f) => ({ ...f, app_tagline: e.target.value }))}
              placeholder="LIVE OPS // CONFERENCE EDITION"
            />
          </div>
        </div>

        {/* ── Colors ── */}
        <div className="settings-section">
          <h3 className="settings-section-title">// COLORS</h3>

          <div className="color-row">
            <div className="color-item">
              <label>ACCENT</label>
              <div className="color-picker-wrap">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
                />
                <span className="color-hex">{form.accent_color}</span>
              </div>
            </div>
            <div className="color-item">
              <label>BACKGROUND</label>
              <div className="color-picker-wrap">
                <input
                  type="color"
                  value={form.bg_color}
                  onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                />
                <span className="color-hex">{form.bg_color}</span>
              </div>
            </div>
            <div className="color-item">
              <label>SURFACE</label>
              <div className="color-picker-wrap">
                <input
                  type="color"
                  value={form.surface_color}
                  onChange={(e) => setForm((f) => ({ ...f, surface_color: e.target.value }))}
                />
                <span className="color-hex">{form.surface_color}</span>
              </div>
            </div>
          </div>

          <button type="button" className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={handleReset}>
            RESET TO DEFAULTS
          </button>
        </div>

        {/* ── Password ── */}
        <div className="settings-section">
          <h3 className="settings-section-title">// ADMIN PASSWORD</h3>
          <div className="form-group">
            <label>NEW PASSWORD</label>
            <input
              type="text"
              value={form.admin_password}
              onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
              placeholder="straiker-admin"
              autoComplete="off"
            />
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {saved && (
          <div className="feedback-msg feedback-msg--correct" style={{ marginBottom: '1rem' }}>
            ✓ SETTINGS SAVED — changes are live instantly
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'SAVING...' : 'SAVE ALL SETTINGS'}
        </button>
      </form>
    </div>
  )
}
