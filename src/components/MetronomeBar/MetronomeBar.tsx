import { BPMSlider } from "./BPMSlider";
import { PlayButton } from "./PlayButton";
import { BeatDots } from "./BeatDots";
import { useMetronome } from "../../hooks/useMetronome";
import "./MetronomeBar.css";

interface MetronomeBarProps {
  bpm: number;
  timeSignature: [number, number];
  isPlaying: boolean;
  onBPMChange: (bpm: number) => void;
  onPlayToggle: () => void;
}

export function MetronomeBar({
  bpm,
  timeSignature,
  isPlaying,
  onBPMChange,
  onPlayToggle,
}: MetronomeBarProps) {
  const { currentBeat } = useMetronome({
    bpm,
    timeSignature,
    isPlaying,
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
      {/* 第一行：节拍指示器 | -按钮 | BPM数字 | +按钮 | 播放按钮 */}
      <div className="metronome-row metronome-row-top">
        <BeatDots currentBeat={currentBeat} beatsPerBar={timeSignature[0]} />
        <div className="bpm-control-group">
          <button
            className="bpm-control-button"
            onClick={handleDecrease}
            disabled={bpm <= min}
            aria-label="Decrease BPM"
          >
            −
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
            +
          </button>
        </div>
        <PlayButton isPlaying={isPlaying} onClick={onPlayToggle} />
      </div>
      {/* 第二行：BPM滑块（撑满） */}
      <div className="metronome-row metronome-row-bottom">
        <BPMSlider bpm={bpm} onChange={onBPMChange} />
      </div>
    </div>
  );
}
