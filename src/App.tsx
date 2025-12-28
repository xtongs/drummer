import './App.css'
import { useState } from 'react'
import { useMetronome } from './hooks/useMetronome'

function App() {
  const {
    isPlaying,
    bpm,
    beat,
    timeSignature,
    subdivision,
    beatStrengths,
    togglePlay,
    setBpm,
    incrementBpm,
    decrementBpm,
    setTimeSignature,
    setSubdivision,
    toggleBeatStrength
  } = useMetronome()

  const [showSettings, setShowSettings] = useState(false)
  const [tapTimes, setTapTimes] = useState<number[]>([])
  const [isBpmChanging, setIsBpmChanging] = useState(false)

  // 处理BPM变化，添加动画效果
  const handleBpmChange = (newBpm: number) => {
    setIsBpmChanging(true)
    setBpm(newBpm)
    setTimeout(() => setIsBpmChanging(false), 200)
  }

  // 点击测速功能
  const handleTap = () => {
    const now = Date.now()
    const newTapTimes = [...tapTimes, now]

    // 只保留最近的10次点击时间
    if (newTapTimes.length > 10) {
      newTapTimes.shift()
    }

    setTapTimes(newTapTimes)

    // 至少需要2次点击才能计算BPM
    if (newTapTimes.length >= 2) {
      // 计算时间差（毫秒）
      const timeDiff = newTapTimes[newTapTimes.length - 1] - newTapTimes[0]
      // 计算点击次数
      const tapCount = newTapTimes.length - 1
      // 计算BPM
      const calculatedBpm = Math.round((tapCount / timeDiff) * 60000)
      // 限制BPM在30-400之间
      const clampedBpm = Math.max(30, Math.min(400, calculatedBpm))
      handleBpmChange(clampedBpm)
    }
  }

  return (
    <div className="app">
      {/* 顶部导航栏 */}
      <nav className="main-nav">
        <div className="nav-logo">节拍器</div>
        <div className="nav-right">
          <button className="nav-button" onClick={() => setShowSettings(!showSettings)}>
            设置
          </button>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="main-content">
        {/* BPM显示与控制 */}
        <div className="bpm-display">
          <div className={`bpm-value ${isBpmChanging ? 'changing' : ''}`}>{bpm}</div>
          <div className="bpm-label">BPM</div>
        </div>

        {/* 节拍指示器，支持节拍细分和强度显示 */}
        <div className="beat-indicator">
          {Array.from({ length: timeSignature.beats }).map((_, beatIndex) => {
            const strength = beatStrengths[beatIndex];

            return (
              <div key={beatIndex} className="beat-group">
                {Array.from({ length: subdivision }).map((_, subIndex) => {
                  const totalIndex = beatIndex * subdivision + subIndex;
                  const isMainBeat = subIndex === 0;
                  const isActive = totalIndex === beat;

                  // 根据节拍强度添加对应的CSS类
                  let strengthClass = '';
                  if (strength === 3) strengthClass = 'strength-3';
                  else if (strength === 2) strengthClass = 'strength-2';
                  else if (strength === 1) strengthClass = 'strength-1';
                  else strengthClass = 'strength-0';

                  return (
                    <div
                      key={`${beatIndex}-${subIndex}`}
                      className={`beat-bar ${isActive ? 'active' : ''} ${isMainBeat ? 'main-beat' : 'sub-beat'} ${strengthClass}`}
                    ></div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 拍号选择 */}
        <div className="time-signature-selector">
          <select
            value={`${timeSignature.beats}/${timeSignature.noteValue}`}
            onChange={(e) => {
              const [beats, noteValue] = e.target.value.split('/').map(Number);
              setTimeSignature({ beats, noteValue });
            }}
            className="time-signature-select"
          >
            <option value="2/4">2/4</option>
            <option value="3/4">3/4</option>
            <option value="4/4">4/4</option>
            <option value="6/8">6/8</option>
            <option value="9/8">9/8</option>
            <option value="12/8">12/8</option>
          </select>
        </div>

        {/* 节拍细分选择 */}
        <div className="subdivision-selector">
          <select
            value={subdivision}
            onChange={(e) => setSubdivision(parseInt(e.target.value))}
            className="subdivision-select"
          >
            <option value="1">四分音符</option>
            <option value="2">八分音符</option>
            <option value="4">十六分音符</option>
            <option value="8">三十二分音符</option>
          </select>
        </div>

        {/* 速度控制滑块 */}
        <div className="slider-container">
          <input
            type="range"
            min="30"
            max="400"
            value={bpm}
            onChange={(e) => {
              const rawValue = parseInt(e.target.value)
              // 实现snap功能：根据BPM值调整步长，与useMetronome.ts中的步长逻辑保持一致
              const step = rawValue < 100 ? 10 : rawValue < 200 ? 5 : 1
              const snappedValue = Math.round(rawValue / step) * step
              setBpm(snappedValue)
            }}
            className="bpm-slider"
            style={{
              '--slider-fill': `${((bpm - 30) / (400 - 30)) * 100}%`
            } as React.CSSProperties}
          />
        </div>

        {/* 精确控制按钮 */}
        <div className="bpm-controls">
          <button className="control-button" onClick={decrementBpm}>-</button>
          <div className="bpm-input-container">
            <input
              type="number"
              min="30"
              max="400"
              value={bpm}
              onChange={(e) => {
                const value = parseInt(e.target.value)
                if (!isNaN(value)) {
                  handleBpmChange(Math.max(30, Math.min(400, value)))
                }
              }}
              className="bpm-input"
            />
          </div>
          <button className="control-button" onClick={incrementBpm}>+</button>
        </div>

        {/* 点击测速按钮 */}
        <div className="tap-section">
          <button className="tap-button" onClick={handleTap}>
            TAP
          </button>
        </div>

        {/* 播放/暂停按钮 */}
        <div className="play-section">
          <button
            onClick={togglePlay}
            className={`play-button ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className={`settings-panel ${showSettings ? 'show' : ''}`}>
            <div className="settings-title">设置</div>
            <div className="settings-content">
              {/* 拍号设置 */}
              <div className="setting-item">
                <label className="setting-label">拍号</label>
                <select
                  value={`${timeSignature.beats}/${timeSignature.noteValue}`}
                  onChange={(e) => {
                    const [beats, noteValue] = e.target.value.split('/').map(Number);
                    setTimeSignature({ beats, noteValue });
                  }}
                  className="setting-select"
                >
                  <option value="1/4">1/4</option>
                  <option value="2/4">2/4</option>
                  <option value="3/4">3/4</option>
                  <option value="4/4">4/4</option>
                  <option value="5/4">5/4</option>
                  <option value="6/4">6/4</option>
                  <option value="6/8">6/8</option>
                  <option value="7/8">7/8</option>
                  <option value="9/8">9/8</option>
                  <option value="12/8">12/8</option>
                  <option value="15/8">15/8</option>
                </select>
              </div>

              {/* 节拍细分设置 */}
              <div className="setting-item">
                <label className="setting-label">节拍细分</label>
                <select
                  value={subdivision}
                  onChange={(e) => setSubdivision(parseInt(e.target.value))}
                  className="setting-select"
                >
                  <option value="1">四分音符</option>
                  <option value="2">八分音符</option>
                  <option value="4">十六分音符</option>
                  <option value="8">三十二分音符</option>
                </select>
              </div>

              {/* 节拍强度设置 */}
              <div className="setting-item">
                <label className="setting-label">节拍强度</label>
                <div className="beat-strength-editor">
                  {Array.from({ length: timeSignature.beats }).map((_, beatIndex) => {
                    const strength = beatStrengths[beatIndex];

                    // 获取强度显示文本
                    const getStrengthText = () => {
                      if (strength === 3) return '强拍';
                      if (strength === 2) return '次强拍';
                      if (strength === 1) return '弱拍';
                      return '静音';
                    };

                    return (
                      <div key={beatIndex} className="beat-strength-item">
                        <button
                          className={`beat-strength-button ${'strength-' + strength}`}
                          onClick={() => toggleBeatStrength(beatIndex)}
                        >
                          第{beatIndex + 1}拍
                        </button>
                        <span className="beat-strength-text">{getStrengthText()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="setting-hint">点击节拍按钮可循环切换强度</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部信息栏 */}
      <footer className="footer">
        <div className="footer-content">
          <span>专业在线节拍器</span>
        </div>
      </footer>
    </div>
  )
}

export default App