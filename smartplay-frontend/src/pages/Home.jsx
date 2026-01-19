import { UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Home.css'

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1>Welcome to Melixa!</h1>
        <p>Discover the mood of your music and get personalized recommendations</p>
        <Link to="/upload" className="upload-cta-button">
          <UploadCloud size={20} />
          Upload Your Audio Here
        </Link>
      </header>
    </div>
  )
}
