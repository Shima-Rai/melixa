import './About.css'

export function About() {
  return (
    <div className="about">
      <div className="about-container">
        <h1 className="page-title">About Melixa</h1>
        
        <section className="about-section section-fade-in">
          <h2>Our Mission</h2>
          <p>
           Melixa leverages advanced AI to analyze audio and accurately identify user mood. Based on this analysis, it delivers personalized music recommendations tailored to each emotional state.
          </p>
        </section>
        
        <section className="about-section section-fade-in">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎵</div>
              <h3>Upload Your Music</h3>
              <p>Simply upload any audio file to get started</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>AI Analysis</h3>
              <p>Our AI analyzes tempo, key, and mood indicators</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Perfect Match</h3>
              <p>Get personalized recommendations that match your vibe</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
