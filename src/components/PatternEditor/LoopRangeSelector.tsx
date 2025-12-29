import "./LoopRangeSelector.css";

interface LoopRangeSelectorProps {
  bars: number;
  loopRange: [number, number] | undefined;
  onLoopRangeChange: (range: [number, number] | undefined) => void;
}

export function LoopRangeSelector({
  bars,
  loopRange,
  onLoopRangeChange,
}: LoopRangeSelectorProps) {
  // 如果没有设置循环范围，使用默认值[0, bars-1]，但不保存到pattern
  const currentRange = loopRange !== undefined ? loopRange : [0, bars - 1];
  
  // 当loopRange为undefined时，点击按钮会设置默认值
  const updateRange = (newRange: [number, number]) => {
    onLoopRangeChange(newRange);
  };

  const handleStartDecrease = () => {
    const newStart = Math.max(0, currentRange[0] - 1);
    if (newStart <= currentRange[1]) {
      updateRange([newStart, currentRange[1]]);
    }
  };

  const handleStartIncrease = () => {
    const newStart = Math.min(bars - 1, currentRange[0] + 1);
    if (newStart <= currentRange[1]) {
      updateRange([newStart, currentRange[1]]);
    }
  };

  const handleEndDecrease = () => {
    const newEnd = Math.max(0, currentRange[1] - 1);
    if (currentRange[0] <= newEnd) {
      updateRange([currentRange[0], newEnd]);
    }
  };

  const handleEndIncrease = () => {
    const newEnd = Math.min(bars - 1, currentRange[1] + 1);
    if (currentRange[0] <= newEnd) {
      updateRange([currentRange[0], newEnd]);
    }
  };

  return (
    <div className="loop-range-selector">
      <span className="loop-range-text">Loop:</span>
      <div className="loop-range-controls">
        <div className="loop-range-item">
          <button
            className="loop-range-button"
            onClick={handleStartDecrease}
            disabled={currentRange[0] <= 0}
            aria-label="Decrease start bar"
          >
            −
          </button>
          <span className="loop-range-value">{currentRange[0] + 1}</span>
          <button
            className="loop-range-button"
            onClick={handleStartIncrease}
            disabled={currentRange[0] >= currentRange[1]}
            aria-label="Increase start bar"
          >
            +
          </button>
        </div>
        <span className="loop-range-separator">-</span>
        <div className="loop-range-item">
          <button
            className="loop-range-button"
            onClick={handleEndDecrease}
            disabled={currentRange[1] <= currentRange[0]}
            aria-label="Decrease end bar"
          >
            −
          </button>
          <span className="loop-range-value">{currentRange[1] + 1}</span>
          <button
            className="loop-range-button"
            onClick={handleEndIncrease}
            disabled={currentRange[1] >= bars - 1}
            aria-label="Increase end bar"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
