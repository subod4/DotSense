import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Home
      </NavLink>
      <NavLink to="/health" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Health
      </NavLink>
      <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Users
      </NavLink>
      <NavLink to="/tutorial" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Tutorial
      </NavLink>
      <NavLink to="/learning" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Learning
      </NavLink>
      <NavLink to="/esp32" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        ESP32
      </NavLink>
    </nav>
  )
}
