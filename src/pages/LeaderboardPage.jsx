import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function LeaderboardPage({ player }) {
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchBoard()

    // Real-time: re-fetch whenever any submission is inserted/updated
    const channel = supabase
      .channel('leaderboard-watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => fetchBoard(),
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchBoard = async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select('player_id, points_earned, players(name, email)')

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // Aggregate per player
    const map = {}
    data.forEach((s) => {
      const pid = s.player_id
      if (!map[pid]) {
        map[pid] = {
          id: pid,
          name: s.players?.name || 'Unknown',
          email: s.players?.email || '',
          points: 0,
          missions: 0,
        }
      }
      map[pid].points += s.points_earned
      map[pid].missions += 1
    })

    const sorted = Object.values(map).sort((a, b) => b.points - a.points)
    setBoard(sorted)
    setLastUpdated(new Date())
    setLoading(false)
  }

  const rankDisplay = (i) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `#${i + 1}`
  }

  return (
    <div className="page leaderboard-page">
      <header className="page-header">
        <h2>LEADERBOARD</h2>
        <span className="live-dot">● LIVE</span>
      </header>

      {lastUpdated && (
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Last updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {loading ? (
        <div className="loading-pulse" style={{ paddingTop: '2rem' }}>
          ACQUIRING SIGNAL...
        </div>
      ) : board.length === 0 ? (
        <div className="empty-state">No operatives on the board yet.</div>
      ) : (
        <div className="board-list">
          {board.map((entry, i) => {
            const isMe = entry.email === player.email
            return (
              <div
                key={entry.id}
                className={[
                  'board-row',
                  isMe ? 'board-row--me' : '',
                  i === 0 ? 'board-row--gold' : '',
                  i === 1 ? 'board-row--silver' : '',
                  i === 2 ? 'board-row--bronze' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="board-rank">{rankDisplay(i)}</span>
                <div className="board-info">
                  <span className="board-name">
                    {entry.name.toUpperCase()}
                    {isMe && <span className="board-you"> (YOU)</span>}
                  </span>
                  <span className="board-missions text-muted">
                    {entry.missions} mission{entry.missions !== 1 ? 's' : ''} complete
                  </span>
                </div>
                <div className="board-score">
                  <span className="board-pts">{entry.points.toLocaleString()}</span>
                  <span className="board-pts-label">PTS</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
