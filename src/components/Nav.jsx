import { NavLink } from 'react-router-dom'

export default function Nav() {
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
    </nav>
  )
}
