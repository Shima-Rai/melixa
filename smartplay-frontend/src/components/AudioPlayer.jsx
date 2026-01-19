import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useAudio } from '../context/AudioContext'
import { useState } from 'react'
import './AudioPlayer.css'

export function AudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    togglePlayPause, 
    handleSeek, 
    formatTime 
  } = useAudio()
  
  const [isDragging, setIsDragging] = useState(false)

  if (!currentTrack) {
    return (
      <div className="audio-player empty">
        <div className="track-info">
          <div className="track-details">
            <div className="track-title">No track selected</div>
            <div className="track-artist">Upload an audio file to start playing</div>
          </div>
        </div>
      </div>
    )
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    handleSeek(newTime)
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)

  return (
    <div className="audio-player">
      <div className="track-info">
        <div className="track-artwork">
          <div className="artwork-placeholder">🎵</div>
        </div>
        <div className="track-details">
          <div className="track-title">{currentTrack.title || 'Unknown Title'}</div>
          <div className="track-artist">{currentTrack.artist || 'Unknown Artist'}</div>
        </div>
      </div>
      
      <div className="player-controls">
        <button className="control-btn">
          <SkipBack size={20} />
        </button>
        <button className="control-btn play-btn" onClick={togglePlayPause}>
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button className="control-btn">
          <SkipForward size={20} />
        </button>
      </div>
      
      <div className="player-extras">
        <div className="progress-container">
          <div className="waveform-container" onClick={handleProgressClick}>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div 
              className="progress-handle" 
              style={{ left: `${progressPercentage}%` }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            ></div>
          </div>
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        <button className="control-btn volume-btn">
          <Volume2 size={20} />
        </button>
      </div>
    </div>
  )
}
