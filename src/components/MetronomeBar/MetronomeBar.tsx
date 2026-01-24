import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { BPMSlider } from "./BPMSlider";
import { BeatDots } from "./BeatDots";
import { PlayButton } from "./PlayButton";
import { useMetronome } from "../../hooks/useMetronome";
import { useLongPress } from "../../hooks/useLongPress";
import { calculateCumulativeRate } from "../../utils/constants";
import "./MetronomeBar.css";

interface MetronomeBarProps {
  bpm: number;
  timeSignature: [number, number];
  isPlaying: boolean;
  onBPMChange: (bpm: number, shouldSave?: boolean) => void;
  isPatternPlaying?: boolean;
  isCountInPlaying?: boolean;
  countInBeat?: number;
  onPatternPlayToggle?: () => void;
  onTimeSignatureChange?: (timeSignature: [number, number]) => void;
  rateIndex: number;
  onRateIndexChange: (index: number) => void;
  rates: number[];
  rateLabels: string[];
  patternPlayButton?: ReactNode;
}

export function MetronomeBar({
  bpm,
  timeSignature,
  isPlaying: _isPlaying,
  onBPMChange,
  isPatternPlaying = false,
  isCountInPlaying = false,
  countInBeat,
  onPatternPlayToggle,
  onTimeSignatureChange,
  rateIndex,
  onRateIndexChange,
  rates,
  rateLabels,
  patternPlayButton,
}: MetronomeBarProps) {
  // 查找当前拍号在列表中的索引
  const commonTimeSignatures = useMemo(
    (): [number, number][] => [
      [4, 4], // 4/4拍
      [3, 4], // 3/4拍
      [2, 4], // 2/4拍
      [6, 8], // 6/8拍
      [5, 4], // 5/4拍
      [7, 8], // 7/8拍
    ],
    []
  );

  const getCurrentTimeSignatureIndex = useCallback(() => {
    const index = commonTimeSignatures.findIndex(
      (ts) => ts[0] === timeSignature[0] && ts[1] === timeSignature[1]
    );
    return index >= 0 ? index : 0;
  }, [timeSignature, commonTimeSignatures]);

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

  const applyRateIndex = (nextRateIndex: number) => {
    if (!rates.length) return;
    const currentCumulativeRate = calculateCumulativeRate(rateIndex, rates);
    const nextCumulativeRate = calculateCumulativeRate(nextRateIndex, rates);
    const baseBPM = bpm / currentCumulativeRate;
    const newBPM = baseBPM * nextCumulativeRate;
    onRateIndexChange(nextRateIndex);
    onBPMChange(newBPM, false);
  };

  // 快速根据速率设置 BPM：左侧 next，右侧 prev
  const handleBPMClickNext = () => {
    applyRateIndex(rateIndex + 1);
  };

  const handleBPMClickPrev = () => {
    if (!rates.length) return;
    applyRateIndex(rateIndex + rates.length - 1);
  };

  const displayBeat =
    isCountInPlaying && countInBeat !== undefined ? countInBeat : currentBeat;

  return (
    <div className="metronome-bar">
      {/* 第一行：节拍指示器 | -按钮 | BPM数字 | +按钮 | 节奏型播放按钮 */}
      <div className="metronome-row metronome-row-top">
        <div
          className="beat-indicator-group"
          onClick={handleTimeSignatureClick}
        >
          <BeatDots currentBeat={displayBeat} beatsPerBar={timeSignature[0]} />
        </div>
        <div className="bpm-control-group">
          <button
            className="bpm-control-button"
            {...decreasePressHandlers}
            disabled={bpm <= min || !!rateLabels[rateIndex % rateLabels.length]}
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
            <span className="bpm-value">
              <span
                className="bpm-value-clickable bpm-value-clickable-left"
                onClick={handleBPMClickNext}
                aria-label="BPM rate next"
              ></span>
              <span
                className="bpm-value-clickable bpm-value-clickable-right"
                onClick={handleBPMClickPrev}
                aria-label="BPM rate prev"
              ></span>
              {Math.round(bpm)}
            </span>
            {rateLabels[rateIndex % rateLabels.length] && (
              <span className="bpm-rate-label">
                {rateLabels[rateIndex % rateLabels.length]}
              </span>
            )}
          </div>
          <button
            className="bpm-control-button"
            {...increasePressHandlers}
            disabled={bpm >= max || !!rateLabels[rateIndex % rateLabels.length]}
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
          {patternPlayButton ? (
            patternPlayButton
          ) : (
            onPatternPlayToggle && (
              <PlayButton
                isPlaying={isPatternPlaying}
                onClick={onPatternPlayToggle}
                loopCount={loopCount}
                onResetCount={handleResetCount}
              />
            )
          )}
        </div>
      </div>
      {/* 第二行：BPM滑块（撑满） */}
      <div className="metronome-row metronome-row-bottom">
        <BPMSlider
          bpm={bpm}
          onChange={onBPMChange}
          disabled={!!rateLabels[rateIndex % rateLabels.length]}
        />
      </div>
    </div>
  );
}
