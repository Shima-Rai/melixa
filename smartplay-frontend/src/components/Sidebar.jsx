import { NavLink } from 'react-router-dom'
import { Home, Upload, Info } from 'lucide-react'
import logo from '../assets/logo.jpeg'
import './Sidebar.css'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <img src={logo} alt="Melixa Logo" className="logo-image" />
        </div>
      </div>
      <nav className="nav-menu">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Upload size={20} />
          <span>Upload</span>
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Info size={20} />
          <span>About</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <p>© 2026 Smart Playlist Matcher</p>
      </div>
    </aside>
  )
}
