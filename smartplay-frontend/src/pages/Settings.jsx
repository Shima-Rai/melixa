import { User, Bell, Shield, Palette, HelpCircle } from 'lucide-react'
import './Settings.css'

export function Settings() {
  return (
    <div className="settings">
      <header className="settings-header">
        <h1>Settings</h1>
        <p>Manage your preferences and account</p>
      </header>
      
      <div className="settings-sections">
        <section className="settings-section">
          <div className="section-header">
            <User size={20} />
            <h2>Profile</h2>
          </div>
          <div className="settings-content">
            <div className="setting-item">
              <label>Display Name</label>
              <input type="text" defaultValue="Music Lover" />
            </div>
            <div className="setting-item">
              <label>Email</label>
              <input type="email" defaultValue="user@example.com" />
            </div>
            <div className="setting-item">
              <label>Bio</label>
              <textarea defaultValue="Music enthusiast and playlist curator" />
            </div>
          </div>
        </section>
        
        <section className="settings-section">
          <div className="section-header">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>
          <div className="settings-content">
            <div className="setting-item">
              <label>Push Notifications</label>
              <div className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </div>
            </div>
            <div className="setting-item">
              <label>Email Updates</label>
              <div className="toggle-switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </div>
            </div>
            <div className="setting-item">
              <label>New Music Alerts</label>
              <div className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </div>
            </div>
          </div>
        </section>
        
        <section className="settings-section">
          <div className="section-header">
            <Palette size={20} />
            <h2>Appearance</h2>
          </div>
          <div className="settings-content">
            <div className="setting-item">
              <label>Theme</label>
              <select>
                <option>Dark</option>
                <option>Light</option>
                <option>Auto</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Accent Color</label>
              <div className="color-options">
                <div className="color-option" style={{ background: '#667eea' }}></div>
                <div className="color-option" style={{ background: '#f093fb' }}></div>
                <div className="color-option" style={{ background: '#4ECDC4' }}></div>
                <div className="color-option" style={{ background: '#FF6B6B' }}></div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="settings-section">
          <div className="section-header">
            <Shield size={20} />
            <h2>Privacy & Security</h2>
          </div>
          <div className="settings-content">
            <div className="setting-item">
              <label>Private Profile</label>
              <div className="toggle-switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </div>
            </div>
            <div className="setting-item">
              <label>Share Listening Data</label>
              <div className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </div>
            </div>
          </div>
        </section>
        
        <section className="settings-section">
          <div className="section-header">
            <HelpCircle size={20} />
            <h2>Support</h2>
          </div>
          <div className="settings-content">
            <button className="support-btn">Help Center</button>
            <button className="support-btn">Contact Support</button>
            <button className="support-btn">Report an Issue</button>
          </div>
        </section>
      </div>
    </div>
  )
}
