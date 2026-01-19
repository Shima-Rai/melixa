import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Upload } from './pages/Upload'
import { About } from './pages/About'
import { AudioPlayer } from './components/AudioPlayer'
import { AudioProvider } from './context/AudioContext'
import './App.css'

function App() {
  return (
    <AudioProvider>
      <Router>
        <div className="app">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
          <AudioPlayer />
        </div>
      </Router>
    </AudioProvider>
  )
}

export default App
