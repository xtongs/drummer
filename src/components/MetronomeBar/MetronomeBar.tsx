import { useState, useEffect, useRef } from "react";
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
  const [index, setIndex] = useState(0);
  // 注意：调换后，isPatternPlaying 现在代表节拍器播放状态
  const { currentBeat } = useMetronome({
    bpm,
    timeSignature,
    isPlaying: isPatternPlaying,
  });

  // 循环计数器
  const [loopCount, setLoopCount] = useState(0);
  const prevBeatRef = useRef<number>(-1);

  // 检测一轮完成（从最后一拍变为第一拍）
  useEffect(() => {
    const beatsPerBar = timeSignature[0];
    // 当从最后一拍变为第一拍时，计数加1
    if (prevBeatRef.current === beatsPerBar - 1 && currentBeat === 0) {
      setLoopCount((prev) => prev + 1);
    }
    prevBeatRef.current = currentBeat;
  }, [currentBeat, timeSignature]);

  // 停止播放时重置计数
  useEffect(() => {
    if (!isPatternPlaying) {
      prevBeatRef.current = -1;
    }
  }, [isPatternPlaying]);

  const handleResetCount = () => {
    setLoopCount(0);
  };

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

  // 快速根据速率设置BPM
  const rateLabels = ["", "x0.875", "x0.75", "x0.5"];
  const rates = [0.875, 0.8571428571, 0.6666666667, 2];

  const handleBPMClick = () => {
    const newBPM = Math.round(bpm * rates[index % rates.length]);
    setIndex(index + 1);
    onBPMChange(newBPM);
  };

  return (
    <div className="metronome-bar">
      {/* 第一行：节拍指示器 | -按钮 | BPM数字 | +按钮 | 节奏型播放按钮 */}
      <div className="metronome-row metronome-row-top">
        <div className="beat-indicator-group">
          <BeatDots currentBeat={currentBeat} beatsPerBar={timeSignature[0]} />
        </div>
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
          <div className="bpm-display" onClick={handleBPMClick}>
            <span className="bpm-value">{bpm}</span>
            {rateLabels[index % rateLabels.length] && (
              <span className="bpm-rate-label">
                {rateLabels[index % rateLabels.length]}
              </span>
            )}
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

        <div className="loop-count-group">
          {onPatternPlayToggle && (
            <PlayButton
              isPlaying={isPatternPlaying}
              onClick={onPatternPlayToggle}
              loopCount={loopCount}
              onResetCount={handleResetCount}
            />
          )}
        </div>
      </div>
      {/* 第二行：BPM滑块（撑满） */}
      <div className="metronome-row metronome-row-bottom">
        <BPMSlider bpm={bpm} onChange={onBPMChange} />
      </div>
    </div>
  );
}
