import { BPMSlider } from "./BPMSlider";
import { BeatDots } from "./BeatDots";
import { PlayButton } from "./PlayButton";
import { useMetronome } from "../../hooks/useMetronome";
import "./MetronomeBar.css";

interface MetronomeBarProps {
  bpm: number;
  timeSignature: [number, number];
  isPlaying: boolean;
  onBPMChange: (bpm: number) => void;
  isPatternPlaying?: boolean;
  onPatternPlayToggle?: () => void;
}

export function MetronomeBar({
  bpm,
  timeSignature,
  isPlaying: _isPlaying,
  onBPMChange,
  isPatternPlaying = false,
  onPatternPlayToggle,
}: MetronomeBarProps) {
  // 注意：调换后，isPatternPlaying 现在代表节拍器播放状态
  const { currentBeat } = useMetronome({
    bpm,
    timeSignature,
    isPlaying: isPatternPlaying,
  });

  const min = 40;
  const max = 200;

  const handleDecrease = () => {
    const newBPM = Math.max(min, bpm - 1);
    onBPMChange(newBPM);
  };

  const handleIncrease = () => {
    const newBPM = Math.min(max, bpm + 1);
    onBPMChange(newBPM);
  };

  return (
    <div className="metronome-bar">
      {/* 第一行：节拍指示器 | -按钮 | BPM数字 | +按钮 | 节奏型播放按钮 */}
      <div className="metronome-row metronome-row-top">
        <BeatDots currentBeat={currentBeat} beatsPerBar={timeSignature[0]} />
        <div className="bpm-control-group">
          <button
            className="bpm-control-button"
            onClick={handleDecrease}
            disabled={bpm <= min}
            aria-label="Decrease BPM"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <div className="bpm-display">
            <span className="bpm-value">{bpm}</span>
          </div>
          <button
            className="bpm-control-button"
            onClick={handleIncrease}
            disabled={bpm >= max}
            aria-label="Increase BPM"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        {onPatternPlayToggle && (
          <PlayButton
            isPlaying={isPatternPlaying}
            onClick={onPatternPlayToggle}
          />
        )}
      </div>
      {/* 第二行：BPM滑块（撑满） */}
      <div className="metronome-row metronome-row-bottom">
        <BPMSlider bpm={bpm} onChange={onBPMChange} />
      </div>
    </div>
  );
}
