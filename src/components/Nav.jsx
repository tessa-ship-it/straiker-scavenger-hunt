import { NavLink } from 'react-router-dom'

const ADMIN_EMAIL = 'tessa@straiker.ai'

export default function Nav({ player }) {
  const isAdmin = player?.email?.toLowerCase() === ADMIN_EMAIL

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      >
        <span className="nav-icon">🎯</span>
        <span className="nav-label">MISSIONS</span>
      </NavLink>
      <NavLink
        to="/leaderboard"
        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">LEADERBOARD</span>
      </NavLink>
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">ADMIN</span>
        </NavLink>
      )}
    </nav>
  )
}
