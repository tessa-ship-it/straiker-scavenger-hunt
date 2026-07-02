import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Change this password to whatever you like ──
const ADMIN_PASSWORD = 'straiker-admin'
const ADMIN_EMAIL = 'tessa@straiker.ai'

const BLANK = {
  name: '',
  description: '',
  points: 100,
  category: '',
  riddle_answer: '',
  mission_type: 'Photo',
}

export default function AdminPage({ player }) {
  const isAdminPlayer = player?.email?.toLowerCase() === ADMIN_EMAIL
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)

  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkCSV, setBulkCSV] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [bulkSuccess, setBulkSuccess] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const [players, setPlayers] = useState([])
  const [playersOpen, setPlayersOpen] = useState(false)
  const [playersLoading, setPlayersLoading] = useState(false)

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
      icon: null,
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

  const openPlayers = async () => {
    setPlayersOpen(true)
    setPlayersLoading(true)
    const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false })
    if (data) setPlayers(data)
    setPlayersLoading(false)
  }

  const handleDeletePlayer = async (player) => {
    if (!window.confirm(`Remove "${player.name}"? This will also delete their submissions.`)) return
    await supabase.from('submissions').delete().eq('player_id', player.id)
    await supabase.from('players').delete().eq('id', player.id)
    setPlayers(prev => prev.filter(p => p.id !== player.id))
  }

  const handleResetPin = async (player) => {
    if (!window.confirm(`Reset PIN for "${player.name}"? They'll be prompted to create a new one on next login.`)) return
    await supabase.from('players').update({ pin: null }).eq('id', player.id)
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, pin: null } : p))
  }

  const handleDownloadRegistrants = async () => {
    const { data } = await supabase
      .from('players')
      .select('first_name, last_name, email, job_title, company_name, created_at')
      .order('created_at')

    if (!data || data.length === 0) { alert('No registrants yet.'); return }

    const header = 'First Name,Last Name,Email,Job Title,Company,Registered At'
    const rows = data.map(p =>
      [p.first_name || '', p.last_name || '', p.email || '', p.job_title || '', p.company_name || '', p.created_at || '']
        .map(v => `"${v}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrants-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async () => {
    setBulkError('')
    setBulkSuccess('')
    setBulkSaving(true)

    try {
      const lines = bulkCSV.trim().split('\n').filter(l => l.trim())
      // Skip header row if it starts with "name"
      const dataLines = lines[0].toLowerCase().startsWith('name') ? lines.slice(1) : lines

      if (dataLines.length === 0) {
        setBulkError('No missions found in CSV.')
        setBulkSaving(false)
        return
      }

      const nextId = missions.length > 0 ? Math.max(...missions.map(m => m.id)) + 1 : 1
      const parsed = dataLines.map((line, i) => {
        // Handle quoted fields with commas inside
        const cols = []
        let cur = '', inQuote = false
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote }
          else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
          else cur += ch
        }
        cols.push(cur.trim())

        const [name, description, points, category, mission_type, riddle_answer] = cols
        return {
          id: nextId + i,
          name: name || '',
          description: description || '',
          points: parseInt(points) || 100,
          category: category || '',
          icon: null,
          mission_type: mission_type === 'Riddle' ? 'Riddle' : 'Photo',
          riddle_answer: riddle_answer || null,
        }
      }).filter(m => m.name)

      if (parsed.length === 0) {
        setBulkError('Could not parse any missions. Check your CSV format.')
        setBulkSaving(false)
        return
      }

      const { error } = await supabase.from('missions').insert(parsed)
      if (error) throw error

      await fetchMissions()
      setBulkSuccess(`✓ ${parsed.length} missions added successfully!`)
      setBulkCSV('')
    } catch (err) {
      setBulkError(err.message)
    }
    setBulkSaving(false)
  }

  // ── Password screen ──────────────────────────────────
  if (!authed) {
    return (
      <div className="register-bg">
        <div className="register-card">
          <div className="register-header">
            <div className="register-logo-glyph">[SEC]</div>
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1rem' }} onClick={openPlayers}>
            PLAYERS
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1rem' }} onClick={handleDownloadRegistrants}>
            ↓ REGISTRANTS
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1rem' }} onClick={() => { setBulkOpen(true); setBulkError(''); setBulkSuccess('') }}>
            ↑ BULK UPLOAD
          </button>
          <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1rem' }} onClick={openAdd}>
            + ADD MISSION
          </button>
        </div>
      </div>

      {/* ── Bulk upload modal ── */}
      {bulkOpen && (
        <div className="admin-modal-bg" onClick={() => setBulkOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">↑ BULK UPLOAD</h3>
            <div className="bulk-hint">
              <strong>Column order:</strong> name, description, points, category, mission_type, riddle_answer<br />
              Category and riddle_answer are optional. First row can be a header.
            </div>
            <div className="form-group">
              <label>CSV DATA</label>
              <textarea
                value={bulkCSV}
                onChange={e => { setBulkCSV(e.target.value); setBulkError(''); setBulkSuccess('') }}
                placeholder={"name,description,points,category,mission_type,riddle_answer\nFind the Badge,Take a photo of your conference badge,100,Recon,Photo,\nThe Answer,I have cities but no houses...,150,Riddle,Riddle,map"}
                rows={8}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
            {bulkError && <div className="error-msg">{bulkError}</div>}
            {bulkSuccess && <div className="feedback-msg feedback-msg--correct">{bulkSuccess}</div>}
            <div className="admin-form-actions">
              <button className="btn-secondary" onClick={() => setBulkOpen(false)}>CANCEL</button>
              <button className="btn-primary" onClick={handleBulkUpload} disabled={bulkSaving || !bulkCSV.trim()} style={{ flex: 1 }}>
                {bulkSaving ? 'UPLOADING...' : 'UPLOAD MISSIONS'}
              </button>
            </div>
          </div>
        </div>
      )}

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

              <div className="form-group">
                <label>POINTS</label>
                <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} min={1} required />
              </div>

              <div className="form-group">
                <label>CATEGORY <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional)</span></label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Signal Detection" />
              </div>

              <div className="form-group">
                <label>MISSION TYPE</label>
                <div className="admin-toggle">
                  <button
                    type="button"
                    className={form.mission_type === 'Photo' ? 'admin-toggle-btn active' : 'admin-toggle-btn'}
                    onClick={() => setForm({ ...form, mission_type: 'Photo' })}
                  >
                    PHOTO
                  </button>
                  <button
                    type="button"
                    className={form.mission_type === 'Riddle' ? 'admin-toggle-btn active' : 'admin-toggle-btn'}
                    onClick={() => setForm({ ...form, mission_type: 'Riddle' })}
                  >
                    RIDDLE
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

      {/* ── Players modal ── */}
      {playersOpen && (
        <div className="admin-modal-bg" onClick={() => setPlayersOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">PLAYERS ({players.length})</h3>
            {playersLoading ? (
              <div className="loading-pulse">LOADING...</div>
            ) : players.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No players registered yet.</p>
            ) : (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {players.map(p => (
                  <div key={p.id} className="admin-row-item">
                    <div className="admin-item-body">
                      <span className="admin-item-name">{p.name}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {p.email} {p.company_name ? `· ${p.company_name}` : ''}
                        {!p.pin && <span style={{ color: 'var(--gold)', marginLeft: '0.4rem' }}>· no PIN</span>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="admin-btn-edit" title="Reset PIN" onClick={() => handleResetPin(p)}>RESET PIN</button>
                      <button className="admin-btn-delete" onClick={() => handleDeletePlayer(p)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setPlayersOpen(false)}>CLOSE</button>
            </div>
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
              <span className="admin-item-icon">{String(m.id).padStart(2, '0')}</span>
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
