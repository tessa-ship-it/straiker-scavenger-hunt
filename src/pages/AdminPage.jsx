import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Change this password to whatever you like ──
const ADMIN_PASSWORD = 'straiker-admin'

const BLANK = {
  name: '',
  description: '',
  points: 100,
  category: '',
  icon: '🎯',
  riddle_answer: '',
  mission_type: 'Photo',
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)

  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(null)   // mission object being edited
  const [adding, setAdding] = useState(false)     // show add form
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (authed) fetchMissions()
  }, [authed])

  const fetchMissions = async () => {
    const { data } = await supabase.from('missions').select('*').order('id')
    if (data) setMissions(data)
    setLoading(false)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      setPwError(true)
    }
  }

  const openAdd = () => {
    const nextId = missions.length > 0 ? Math.max(...missions.map((m) => m.id)) + 1 : 1
    setForm({ ...BLANK, id: nextId })
    setAdding(true)
    setEditing(null)
  }

  const openEdit = (mission) => {
    setForm({ ...mission })
    setEditing(mission)
    setAdding(false)
  }

  const closeForm = () => {
    setAdding(false)
    setEditing(null)
    setForm(BLANK)
    setSaveError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      points: parseInt(form.points),
      category: form.category.trim(),
      icon: form.icon.trim(),
      riddle_answer: form.mission_type === 'Riddle' ? form.riddle_answer.trim() : null,
      mission_type: form.mission_type,
    }

    let error
    if (adding) {
      ;({ error } = await supabase.from('missions').insert([{ id: form.id, ...payload }]))
    } else {
      ;({ error } = await supabase.from('missions').update(payload).eq('id', editing.id))
    }

    if (error) {
      setSaveError(error.message)
    } else {
      await fetchMissions()
      closeForm()
    }
    setSaving(false)
  }

  const handleDelete = async (mission) => {
    if (!window.confirm(`Delete "${mission.name}"? This cannot be undone.`)) return
    await supabase.from('missions').delete().eq('id', mission.id)
    await fetchMissions()
  }

  // ── Password screen ──────────────────────────────────
  if (!authed) {
    return (
      <div className="register-bg">
        <div className="register-card">
          <div className="register-header">
            <div className="register-logo">🔐</div>
            <h1 className="register-title" style={{ fontSize: '1.5rem' }}>ADMIN</h1>
            <p className="register-sub">MISSION CONTROL</p>
          </div>
          <form onSubmit={handleLogin} className="register-form">
            <div className="form-group">
              <label>PASSWORD</label>
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

  // ── Mission form (add / edit) ────────────────────────
  const showForm = adding || editing

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div>
          <h2>MISSION CONTROL</h2>
          <p className="text-muted">{missions.length} missions total</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1rem' }} onClick={openAdd}>
          + ADD MISSION
        </button>
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <div className="admin-modal-bg" onClick={closeForm}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">
              {adding ? '+ NEW MISSION' : `EDIT: ${editing.name}`}
            </h3>

            <form onSubmit={handleSave}>
              {adding && (
                <div className="form-group">
                  <label>ID #</label>
                  <input type="number" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required />
                </div>
              )}

              <div className="form-group">
                <label>MISSION NAME</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Ghost in the Machine" required />
              </div>

              <div className="form-group">
                <label>DESCRIPTION</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mission briefing text..."
                  rows={3}
                  required
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '0.75rem', fontFamily: 'var(--font-body)', fontSize: '1rem', resize: 'vertical', outline: 'none' }}
                />
              </div>

              <div className="admin-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>POINTS</label>
                  <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} min={1} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>ICON (emoji)</label>
                  <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🎯" />
                </div>
              </div>

              <div className="form-group">
                <label>CATEGORY</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Signal Detection" required />
              </div>

              <div className="form-group">
                <label>MISSION TYPE</label>
                <div className="admin-toggle">
                  <button
                    type="button"
                    className={form.mission_type === 'Photo' ? 'admin-toggle-btn active' : 'admin-toggle-btn'}
                    onClick={() => setForm({ ...form, mission_type: 'Photo' })}
                  >
                    📷 PHOTO
                  </button>
                  <button
                    type="button"
                    className={form.mission_type === 'Riddle' ? 'admin-toggle-btn active' : 'admin-toggle-btn'}
                    onClick={() => setForm({ ...form, mission_type: 'Riddle' })}
                  >
                    🧩 RIDDLE
                  </button>
                </div>
              </div>

              {form.mission_type === 'Riddle' && (
                <div className="form-group">
                  <label>RIDDLE ANSWER</label>
                  <input
                    type="text"
                    value={form.riddle_answer}
                    onChange={(e) => setForm({ ...form, riddle_answer: e.target.value })}
                    placeholder="Case-insensitive answer"
                    required
                  />
                </div>
              )}

              {saveError && <div className="error-msg">{saveError}</div>}

              <div className="admin-form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>CANCEL</button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'SAVING...' : 'SAVE MISSION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mission list ── */}
      {loading ? (
        <div className="loading-pulse">LOADING...</div>
      ) : (
        <div className="admin-list">
          {missions.map((m) => (
            <div key={m.id} className="admin-row-item">
              <span className="admin-item-icon">{m.icon}</span>
              <div className="admin-item-body">
                <span className="admin-item-name">{m.name}</span>
                <span className="text-muted">{m.points} pts · {m.mission_type} · {m.category}</span>
              </div>
              <div className="admin-item-actions">
                <button className="admin-btn-edit" onClick={() => openEdit(m)}>EDIT</button>
                <button className="admin-btn-delete" onClick={() => handleDelete(m)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
