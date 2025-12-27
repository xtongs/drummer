import './App.css'
import { useMetronome } from './hooks/useMetronome'

function App() {
  const {
    isPlaying,
    bpm,
    beat,
    timeSignature,
    togglePlay,
    setBpm,
    incrementBpm,
    decrementBpm,
    setTimeSignature
  } = useMetronome()

  return (
    <div className="app">
      {/* 顶部状态栏 */}
      <header className="top-bar">
        <div className="beat-section">
          <div className="beat-indicator">
            {Array.from({ length: timeSignature }).map((_, index) => (
              <div
                key={index}
                className={`beat-dot ${beat === index ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="bpm-section">
          <span className="bpm-value">{bpm}</span>
        </div>

        <div className="time-signature-section">
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(parseInt(e.target.value))}
            className="time-signature-select"
          >
            <option value="2">2/4</option>
            <option value="3">3/4</option>
            <option value="4">4/4</option>
            <option value="6">6/8</option>
          </select>
        </div>
      </header>

      {/* 速度控制区域 */}
      <div className="speed-control">
        <button className="bpm-button bpm-decrease" onClick={decrementBpm}>-</button>
        <div className="slider-container">
          <input
            type="range"
            min="60"
            max="300"
            value={bpm}
            onChange={(e) => {
              const rawValue = parseInt(e.target.value);
              // 实现snap功能：中间值(180)左边整10，右边整5
              const middleValue = 180;
              let snappedValue;
              if (rawValue <= middleValue) {
                // 左边整10
                snappedValue = Math.round(rawValue / 10) * 10;
              } else {
                // 右边整5
                snappedValue = Math.round(rawValue / 5) * 5;
              }
              setBpm(snappedValue);
            }}
            className="bpm-slider"
          />
        </div>
        <button className="bpm-button bpm-increase" onClick={incrementBpm}>+</button>
      </div>

      {/* 主内容区域 */}
      <main className="main-content">
        {/* 播放按钮 */}
        <div className="play-button-container">
          <button
            onClick={togglePlay}
            className={`play-button ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? (
              <span className="pause-icon">⏸</span>
            ) : (
              <span className="play-icon">▶</span>
            )}
          </button>
        </div>

        {/* 主场景占位符 */}
        <div className="main-scene">
          <div className="placeholder"></div>
        </div>
      </main>

      {/* 底部信息栏 */}
      <footer className="bottom-bar">
        <span className="status-text">READY</span>
      </footer>
    </div>
  )
}

export default App