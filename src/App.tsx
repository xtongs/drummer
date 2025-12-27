import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [beat, setBeat] = useState(0)
  const [timeSignature, setTimeSignature] = useState(4)
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const playClick = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const audioContext = audioContextRef.current
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(beat === 0 ? 800 : 400, audioContext.currentTime)
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  useEffect(() => {
    if (isPlaying) {
      const interval = 60000 / bpm
      intervalRef.current = setInterval(() => {
        playClick()
        setBeat((prev) => (prev + 1) % timeSignature)
      }, interval)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, bpm, timeSignature])

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      setBeat(0)
    }
  }

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(parseInt(e.target.value))
  }

  const handleTimeSignatureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeSignature(parseInt(e.target.value))
    setBeat(0)
  }

  return (
    <div className="app">
      <div className="metronome">
        <h1 className="title">节拍器</h1>
        
        <div className="beat-indicator">
          {Array.from({ length: timeSignature }).map((_, index) => (
            <div
              key={index}
              className={`beat-dot ${beat === index ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="bpm-control">
          <label className="bpm-label">{bpm} BPM</label>
          <input
            type="range"
            min="40"
            max="200"
            value={bpm}
            onChange={handleBpmChange}
            className="bpm-slider"
          />
        </div>

        <div className="time-signature-control">
          <label className="time-signature-label">拍号</label>
          <select
            value={timeSignature}
            onChange={handleTimeSignatureChange}
            className="time-signature-select"
          >
            <option value="2">2/4</option>
            <option value="3">3/4</option>
            <option value="4">4/4</option>
            <option value="6">6/8</option>
          </select>
        </div>

        <button
          onClick={handleTogglePlay}
          className={`play-button ${isPlaying ? 'playing' : ''}`}
        >
          {isPlaying ? '停止' : '播放'}
        </button>
      </div>
    </div>
  )
}

export default App