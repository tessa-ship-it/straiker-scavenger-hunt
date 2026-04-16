import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MissionPage({ player }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [mission, setMission] = useState(null)
  const [answer, setAnswer] = useState('')
  const [photo, setPhoto] = useState(null)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchMission()
  }, [id, player.id])

  const fetchMission = async () => {
    const [{ data: missionData }, { data: subData }] = await Promise.all([
      supabase.from('missions').select('*').eq('id', parseInt(id)).maybeSingle(),
      supabase.from('submissions').select('id').eq('player_id', player.id).eq('mission_id', parseInt(id)).maybeSingle(),
    ])
    setMission(missionData)
    if (subData) setAlreadyDone(true)
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-screen"><div className="loading-pulse">LOADING...</div></div>
  }

  if (!mission) {
    return (
      <div className="page">
        <button className="btn-back" onClick={() => navigate('/')}>← BACK</button>
        <p>Mission not found.</p>
      </div>
    )
  }

  // ── Riddle submit ────────────────────────────────────
  const handleRiddleSubmit = async (e) => {
    e.preventDefault()
    const userAnswer = answer.trim().toLowerCase()
    const correct = (mission.riddle_answer || '').toLowerCase()

    if (userAnswer !== correct) {
      setFeedback({ type: 'wrong', msg: '✗  INCORRECT SIGNAL. Recalibrate and try again.' })
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.from('submissions').insert([
        {
          player_id: player.id,
          mission_id: mission.id,
          answer_text: answer.trim(),
          points_earned: mission.points,
        },
      ])

      if (err) {
        if (err.code === '23505') {
          setAlreadyDone(true)
        } else throw err
      } else {
        setFeedback({ type: 'correct', msg: `✓  SIGNAL ACQUIRED — +${mission.points} PTS` })
        setSubmitted(true)
      }
    } catch (err) {
      setError('Submission failed. Check your connection.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Photo submit ─────────────────────────────────────
  const handlePhotoSubmit = async (e) => {
    e.preventDefault()
    if (!photo) return

    setLoading(true)
    setError('')

    try {
      const ext = photo.name.split('.').pop()
      const path = `${player.id}/${mission.id}-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('mission-photos')
        .upload(path, photo, { upsert: false })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(path)

      const { error: insertErr } = await supabase.from('submissions').insert([
        {
          player_id: player.id,
          mission_id: mission.id,
          image_url: urlData.publicUrl,
          answer_text: caption.trim() || null,
          points_earned: mission.points,
        },
      ])

      if (insertErr) {
        if (insertErr.code === '23505') {
          setAlreadyDone(true)
        } else throw insertErr
      } else {
        setFeedback({ type: 'correct', msg: `✓  EVIDENCE SECURED — +${mission.points} PTS` })
        setSubmitted(true)
      }
    } catch (err) {
      setError('Upload failed. Check your connection and try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page mission-page">
      <button className="btn-back" onClick={() => navigate('/')}>
        ← BACK TO MISSIONS
      </button>

      {/* Header */}
      <div className="mp-header">
        <span className="mp-icon">{mission.icon}</span>
        <div className="mp-header-text">
          <span className={`type-badge type-badge--${mission.mission_type.toLowerCase()}`}>
            {mission.mission_type === 'Photo' ? '📷 PHOTO' : '🧩 RIDDLE'}
          </span>
          <h1 className="mp-title">{mission.name}</h1>
          <div className="mp-meta">
            <span className="mp-category">{mission.category.toUpperCase()}</span>
            <span className="mp-pts-big">{mission.points} PTS</span>
          </div>
        </div>
      </div>

      {/* Briefing */}
      <div className="briefing-block">
        <span className="briefing-tag">// MISSION BRIEFING</span>
        <p className="briefing-text">{mission.description}</p>
      </div>

      {/* Already complete */}
      {alreadyDone && (
        <div className="status-banner status-banner--success">
          ✓ MISSION COMPLETE — {mission.points} POINTS SECURED
        </div>
      )}

      {/* Submit form */}
      {!alreadyDone && !submitted && (
        <div className="submit-card">
          {mission.mission_type === 'Riddle' ? (
            <form onSubmit={handleRiddleSubmit}>
              <div className="form-group">
                <label htmlFor="riddle-answer">YOUR ANSWER</label>
                <input
                  id="riddle-answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Transmit your signal..."
                  autoComplete="off"
                  required
                />
              </div>

              {feedback && (
                <div className={`feedback-msg feedback-msg--${feedback.type}`}>
                  {feedback.msg}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading || !answer.trim()}>
                {loading ? 'PROCESSING...' : 'TRANSMIT ANSWER'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhotoSubmit}>
              <div className="form-group">
                <label>UPLOAD EVIDENCE</label>
                <div
                  className="photo-drop"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photo ? (
                    <div className="photo-preview">
                      <img src={URL.createObjectURL(photo)} alt="Preview" />
                      <span className="photo-name">{photo.name}</span>
                    </div>
                  ) : (
                    <div className="photo-empty">
                      <span className="photo-empty-icon">📷</span>
                      <span className="photo-empty-text">TAP TO CAPTURE EVIDENCE</span>
                      <span className="photo-empty-sub">Camera or gallery</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhoto(e.target.files[0] || null)}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="caption">INTEL NOTE (OPTIONAL)</label>
                <input
                  id="caption"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add context..."
                  autoComplete="off"
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !photo}
              >
                {loading ? 'UPLOADING...' : 'SUBMIT EVIDENCE'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Post-submit */}
      {submitted && feedback && (
        <div className={`status-banner status-banner--${feedback.type === 'correct' ? 'success' : 'error'}`}>
          <p>{feedback.msg}</p>
          <button
            className="btn-secondary"
            onClick={() => navigate('/')}
            style={{ marginTop: '1rem' }}
          >
            RETURN TO BASE
          </button>
        </div>
      )}
    </div>
  )
}
