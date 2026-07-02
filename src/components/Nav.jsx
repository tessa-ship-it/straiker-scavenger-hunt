import { NavLink } from 'react-router-dom'

const ADMIN_EMAIL = 'tessa@straiker.ai'

// Hard-edged stroke icons — currentColor so active/hover states tint them
const CrosshairIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <line x1="12" y1="1.5" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22.5" />
    <line x1="1.5" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22.5" y2="12" />
    <rect x="11" y="11" width="2" height="2" fill="currentColor" stroke="none" />
  </svg>
)

const SignalBarsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <line x1="5" y1="21" x2="5" y2="14" />
    <line x1="12" y1="21" x2="12" y2="8" />
    <line x1="19" y1="21" x2="19" y2="3" />
  </svg>
)

const ControlIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <line x1="3" y1="7" x2="21" y2="7" />
    <line x1="3" y1="17" x2="21" y2="17" />
    <rect x="7" y="4.5" width="4" height="5" fill="currentColor" stroke="none" />
    <rect x="14" y="14.5" width="4" height="5" fill="currentColor" stroke="none" />
  </svg>
)

export default function Nav({ player }) {
  const isAdmin = player?.email?.toLowerCase() === ADMIN_EMAIL

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      >
        <span className="nav-icon"><CrosshairIcon /></span>
        <span className="nav-label">MISSIONS</span>
      </NavLink>
      <NavLink
        to="/leaderboard"
        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      >
        <span className="nav-icon"><SignalBarsIcon /></span>
        <span className="nav-label">LEADERBOARD</span>
      </NavLink>
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
        >
          <span className="nav-icon"><ControlIcon /></span>
          <span className="nav-label">ADMIN</span>
        </NavLink>
      )}
    </nav>
  )
}
