import './Mood.css'

export function Mood() {
  const moods = [
    {
      id: 1,
      name: 'Happy',
      emoji: '😊',
      color: 'linear-gradient(135deg, #FFE66D 0%, #FF6B6B 100%)',
      description: 'Upbeat and energetic tracks'
    },
    {
      id: 2,
      name: 'Sad',
      emoji: '😢',
      color: 'linear-gradient(135deg, #4A90E2 0%, #7B68EE 100%)',
      description: 'Emotional and reflective songs'
    },
    {
      id: 3,
      name: 'Energetic',
      emoji: '⚡',
      color: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      description: 'High-energy workout music'
    },
    {
      id: 4,
      name: 'Relaxed',
      emoji: '😌',
      color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
      description: 'Calm and peaceful melodies'
    },
    {
      id: 5,
      name: 'Focused',
      emoji: '🎯',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Concentration-enhancing tracks'
    },
    {
      id: 6,
      name: 'Romantic',
      emoji: '💕',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: 'Love and romance songs'
    },
    {
      id: 7,
      name: 'Party',
      emoji: '🎉',
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      description: 'Dance and celebration hits'
    },
    {
      id: 8,
      name: 'Sleepy',
      emoji: '😴',
      color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      description: 'Soothing bedtime music'
    }
  ]

  return (
    <div className="mood">
      <header className="mood-header">
        <h1>How are you feeling?</h1>
        <p>Select your current mood to get personalized music recommendations</p>
      </header>
      
      <div className="mood-grid">
        {moods.map(mood => (
          <div key={mood.id} className="mood-card">
            <div 
              className="mood-card-bg"
              style={{ background: mood.color }}
            ></div>
            <div className="mood-content">
              <div className="mood-emoji">{mood.emoji}</div>
              <h3>{mood.name}</h3>
              <p>{mood.description}</p>
              <button className="select-mood-btn">
                Select Mood
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
