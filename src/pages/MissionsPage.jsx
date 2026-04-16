import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MissionsPage({ player }) {
  const [missions, setMissions] = useState([])
  const [completed, setCompleted] = useState(new Set())
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [player.id])

  const fetchAll = async () => {
    const [{ data: missionData }, { data: subData }] = await Promise.all([
      supabase.from('missions').select('*').order('id'),
      supabase.from('submissions').select('mission_id, points_earned').eq('player_id', player.id),
    ])
    if (missionData) setMissions(missionData)
    if (subData) {
      setCompleted(new Set(subData.map((s) => s.mission_id)))
      setTotalPoints(subData.reduce((sum, s) => sum + s.points_earned, 0))
    }
    setLoading(false)
  }

  const maxPoints = missions.reduce((sum, m) => sum + m.points, 0)
  const progressPct = maxPoints > 0 ? Math.min((totalPoints / maxPoints) * 100, 100) : 0

  return (
    <div className="page missions-page">
      <header className="page-header">
        <div>
          <p className="operative-label">OPERATIVE</p>
          <h2 className="operative-name">{player.name.toUpperCase()}</h2>
          <p className="text-muted">
            {completed.size}/{missions.length} MISSIONS COMPLETE
          </p>
        </div>
        <div className="points-display">
          <span className="points-value">{totalPoints.toLocaleString()}</span>
          <span className="points-unit">PTS</span>
        </div>
      </header>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        <span className="progress-pct">{Math.round(progressPct)}%</span>
      </div>

      {loading ? (
        <div className="loading-pulse" style={{ paddingTop: '2rem' }}>
          LOADING MISSIONS...
        </div>
      ) : (
        <div className="missions-list">
          {missions.map((mission) => {
            const done = completed.has(mission.id)
            return (
              <Link
                key={mission.id}
                to={`/mission/${mission.id}`}
                className={`mission-card${done ? ' mission-card--done' : ''}`}
              >
                <div className="mc-icon">{mission.icon}</div>
                <div className="mc-body">
                  <div className="mc-meta">
                    <span className={`type-badge type-badge--${mission.mission_type.toLowerCase()}`}>
                      {mission.mission_type === 'Photo' ? '📷 PHOTO' : '🧩 RIDDLE'}
                    </span>
                    <span className="mc-category">{mission.category.toUpperCase()}</span>
                  </div>
                  <h3 className="mc-name">{mission.name}</h3>
                  <p className="mc-desc">{mission.description}</p>
                </div>
                <div className="mc-right">
                  {done ? (
                    <span className="mc-done-check">✓</span>
                  ) : (
                    <>
                      <span className="mc-pts">{mission.points}</span>
                      <span className="mc-pts-label">PTS</span>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
