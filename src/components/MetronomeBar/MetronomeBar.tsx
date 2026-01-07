import { useState, useEffect, useRef, useCallback } from "react";
import { BPMSlider } from "./BPMSlider";
import { BeatDots } from "./BeatDots";
import { PlayButton } from "./PlayButton";
import { useMetronome } from "../../hooks/useMetronome";
import { useLongPress } from "../../hooks/useLongPress";
import "./MetronomeBar.css";

interface MetronomeBarProps {
  bpm: number;
  timeSignature: [number, number];
  isPlaying: boolean;
  onBPMChange: (bpm: number, shouldSave?: boolean) => void;
  isPatternPlaying?: boolean;
  onPatternPlayToggle?: () => void;
  onTimeSignatureChange?: (timeSignature: [number, number]) => void;
  onResetRate?: number;
}

export function MetronomeBar({
  bpm,
  timeSignature,
  isPlaying: _isPlaying,
  onBPMChange,
  isPatternPlaying = false,
  onPatternPlayToggle,
  onTimeSignatureChange,
  onResetRate,
}: MetronomeBarProps) {
  const [index, setIndex] = useState(0);
  const prevResetRateRef = useRef<number>(0);

  // 重置 BPM rate index
  useEffect(() => {
    if (onResetRate && onResetRate !== prevResetRateRef.current) {
      setIndex(0);
      prevResetRateRef.current = onResetRate;
    }
  }, [onResetRate]);

  // 常用拍号列表
  const commonTimeSignatures: [number, number][] = [
    [4, 4], // 4/4拍
    [3, 4], // 3/4拍
    [2, 4], // 2/4拍
    [6, 8], // 6/8拍
    [5, 4], // 5/4拍
    [7, 8], // 7/8拍
  ];

  // 查找当前拍号在列表中的索引
  const getCurrentTimeSignatureIndex = useCallback(() => {
    const index = commonTimeSignatures.findIndex(
      (ts) => ts[0] === timeSignature[0] && ts[1] === timeSignature[1]
    );
    return index >= 0 ? index : 0;
  }, [timeSignature]);

  const [timeSignatureIndex, setTimeSignatureIndex] = useState(() => {
    const index = commonTimeSignatures.findIndex(
      (ts) => ts[0] === timeSignature[0] && ts[1] === timeSignature[1]
    );
    return index >= 0 ? index : 0;
  });

  // 当外部 timeSignature 改变时，同步索引
  useEffect(() => {
    const newIndex = getCurrentTimeSignatureIndex();
    setTimeSignatureIndex(newIndex);
  }, [getCurrentTimeSignatureIndex]);

  // 切换拍号
  const handleTimeSignatureClick = () => {
    if (onTimeSignatureChange) {
      const nextIndex = (timeSignatureIndex + 1) % commonTimeSignatures.length;
      const nextTimeSignature = commonTimeSignatures[nextIndex];
      setTimeSignatureIndex(nextIndex);
      onTimeSignatureChange(nextTimeSignature);
    }
  };
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
      setLoopCount(0);
    }
  }, [isPatternPlaying]);

  const handleResetCount = () => {
    setLoopCount(0);
  };

  const min = 40;
  const max = 200;

  const handleDecrease = () => {
    const newBPM = Math.round(Math.max(min, bpm - 1));
    onBPMChange(newBPM);
  };

  const handleIncrease = () => {
    const newBPM = Math.round(Math.min(max, bpm + 1));
    onBPMChange(newBPM);
  };

  const decreasePressHandlers = useLongPress(handleDecrease, {
    shouldStop: () => bpm <= min,
  });

  const increasePressHandlers = useLongPress(handleIncrease, {
    shouldStop: () => bpm >= max,
  });

  // 快速根据速率设置BPM
  // 使用精确的分数值，确保乘积为1，循环后能精确回到原始值
  const rateLabels = ["", "x0.875", "x0.75", "x0.5"];
  const rates = [7 / 8, 6 / 7, 2 / 3, 2]; // 精确分数：7/8 × 6/7 × 2/3 × 2 = 1

  const handleBPMClick = () => {
    const newBPM = bpm * rates[index % rates.length];
    setIndex(index + 1);
    onBPMChange(newBPM, false);
  };

  return (
    <div className="metronome-bar">
      {/* 第一行：节拍指示器 | -按钮 | BPM数字 | +按钮 | 节奏型播放按钮 */}
      <div className="metronome-row metronome-row-top">
        <div
          className="beat-indicator-group"
          onClick={handleTimeSignatureClick}
        >
          <BeatDots currentBeat={currentBeat} beatsPerBar={timeSignature[0]} />
        </div>
        <div className="bpm-control-group">
          <button
            className="bpm-control-button"
            {...decreasePressHandlers}
            disabled={bpm <= min || !!rateLabels[index % rateLabels.length]}
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
            <span className="bpm-value">{Math.round(bpm)}</span>
            {rateLabels[index % rateLabels.length] && (
              <span className="bpm-rate-label">
                {rateLabels[index % rateLabels.length]}
              </span>
            )}
          </div>
          <button
            className="bpm-control-button"
            {...increasePressHandlers}
            disabled={bpm >= max || !!rateLabels[index % rateLabels.length]}
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
        <BPMSlider
          bpm={bpm}
          onChange={onBPMChange}
          disabled={!!rateLabels[index % rateLabels.length]}
        />
      </div>
    </div>
  );
}
