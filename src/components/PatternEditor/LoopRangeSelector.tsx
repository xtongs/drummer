import { useEffect } from "react";
import type { Pattern, CrossPatternLoop } from "../../types";
import "./LoopRangeSelector.css";

interface LoopRangeSelectorProps {
  currentPattern: Pattern;
  savedPatterns: Pattern[];
  crossPatternLoop: CrossPatternLoop | undefined;
  onCrossPatternLoopChange: (loop: CrossPatternLoop | undefined) => void;
  isDraftMode: boolean;
}

export function LoopRangeSelector({
  currentPattern,
  savedPatterns,
  crossPatternLoop,
  onCrossPatternLoopChange,
  isDraftMode,
}: LoopRangeSelectorProps) {
  // 按名称排序的 patterns
  const sortedPatterns = [...savedPatterns].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // 获取 pattern 的小节数
  const getPatternBars = (patternName: string): number => {
    if (isDraftMode && patternName === "") {
      return currentPattern.bars;
    }
    // 如果 patternName 匹配当前编辑的 pattern，使用当前编辑的 bars（可能未保存）
    if (!isDraftMode && patternName === currentPattern.name) {
      return currentPattern.bars;
    }
    const pattern = savedPatterns.find((p) => p.name === patternName);
    return pattern?.bars ?? currentPattern.bars;
  };

  // 检查 pattern 是否存在（用于判断是否完成加载）
  const isPatternLoaded = (patternName: string): boolean => {
    if (patternName === "") return true; // 草稿总是存在
    if (patternName === currentPattern.name) return true; // 当前编辑的 pattern
    return savedPatterns.some((p) => p.name === patternName);
  };

  // 当前的循环范围
  // 如果没有设置跨 pattern 循环，默认使用当前 pattern 的范围
  const defaultLoop: CrossPatternLoop = {
    startPatternName: isDraftMode ? "" : currentPattern.name,
    startBar: 0,
    endPatternName: isDraftMode ? "" : currentPattern.name,
    endBar: currentPattern.bars - 1,
  };

  // 比较两个位置的先后顺序
  const comparePositions = (
    patternName1: string,
    bar1: number,
    patternName2: string,
    bar2: number
  ): number => {
    if (patternName1 === patternName2) {
      return bar1 - bar2;
    }
    // 空字符串（草稿）排在最前面
    if (patternName1 === "") return -1;
    if (patternName2 === "") return 1;
    return patternName1.localeCompare(patternName2);
  };

  const loop = crossPatternLoop ?? defaultLoop;

  // 当 bars 数量变化时，自动调整 loop 范围
  useEffect(() => {
    if (!crossPatternLoop) return;

    // 如果 pattern 还在加载中，不要调整 range
    if (!isPatternLoaded(crossPatternLoop.startPatternName) || 
        !isPatternLoaded(crossPatternLoop.endPatternName)) {
      return;
    }

    const startBars = getPatternBars(crossPatternLoop.startPatternName);
    const endBars = getPatternBars(crossPatternLoop.endPatternName);
    
    let needsUpdate = false;
    let updatedLoop = { ...crossPatternLoop };

    // 如果开始小节超出范围，调整到最大值
    if (crossPatternLoop.startBar >= startBars) {
      updatedLoop.startBar = Math.max(0, startBars - 1);
      needsUpdate = true;
    }

    // 如果结束小节超出范围，调整到最大值
    if (crossPatternLoop.endBar >= endBars) {
      updatedLoop.endBar = Math.max(0, endBars - 1);
      needsUpdate = true;
    }

    // 确保开始位置不超过结束位置
    if (needsUpdate && comparePositions(
      updatedLoop.startPatternName,
      updatedLoop.startBar,
      updatedLoop.endPatternName,
      updatedLoop.endBar
    ) > 0) {
      // 如果开始位置超过结束位置，将结束位置调整为开始位置
      updatedLoop.endBar = updatedLoop.startBar;
    }

    if (needsUpdate) {
      onCrossPatternLoopChange(updatedLoop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPattern.bars, isDraftMode, currentPattern.name, savedPatterns]);

  // 获取可选的 patterns 列表（草稿模式用空字符串表示）
  const patternOptions = isDraftMode
    ? [{ name: "", label: "○" }, ...sortedPatterns.map((p) => ({ name: p.name, label: p.name }))]
    : sortedPatterns.map((p) => ({ name: p.name, label: p.name }));

  const handleStartPatternChange = (newPatternName: string) => {
    const newBars = getPatternBars(newPatternName);
    let newStartBar = Math.min(loop.startBar, newBars - 1);
    
    // 确保开始位置不超过结束位置
    if (comparePositions(newPatternName, newStartBar, loop.endPatternName, loop.endBar) > 0) {
      // 如果新的开始位置超过了结束位置，调整结束位置
      onCrossPatternLoopChange({
        startPatternName: newPatternName,
        startBar: newStartBar,
        endPatternName: newPatternName,
        endBar: newStartBar,
      });
    } else {
      onCrossPatternLoopChange({
        ...loop,
        startPatternName: newPatternName,
        startBar: newStartBar,
      });
    }
  };

  const handleEndPatternChange = (newPatternName: string) => {
    const newBars = getPatternBars(newPatternName);
    let newEndBar = Math.min(loop.endBar, newBars - 1);
    
    // 确保结束位置不早于开始位置
    if (comparePositions(loop.startPatternName, loop.startBar, newPatternName, newEndBar) > 0) {
      // 如果新的结束位置早于开始位置，调整开始位置
      onCrossPatternLoopChange({
        startPatternName: newPatternName,
        startBar: newEndBar,
        endPatternName: newPatternName,
        endBar: newEndBar,
      });
    } else {
      onCrossPatternLoopChange({
        ...loop,
        endPatternName: newPatternName,
        endBar: newEndBar,
      });
    }
  };

  const handleStartBarDecrease = () => {
    if (loop.startBar > 0) {
      onCrossPatternLoopChange({
        ...loop,
        startBar: loop.startBar - 1,
      });
    }
  };

  const handleStartBarIncrease = () => {
    const maxBar = getPatternBars(loop.startPatternName) - 1;
    const newStartBar = Math.min(maxBar, loop.startBar + 1);
    
    // 确保不超过结束位置
    if (comparePositions(loop.startPatternName, newStartBar, loop.endPatternName, loop.endBar) <= 0) {
      onCrossPatternLoopChange({
        ...loop,
        startBar: newStartBar,
      });
    }
  };

  const handleEndBarDecrease = () => {
    const newEndBar = loop.endBar - 1;
    
    // 确保不早于开始位置
    if (newEndBar >= 0 && comparePositions(loop.startPatternName, loop.startBar, loop.endPatternName, newEndBar) <= 0) {
      onCrossPatternLoopChange({
        ...loop,
        endBar: newEndBar,
      });
    }
  };

  const handleEndBarIncrease = () => {
    const maxBar = getPatternBars(loop.endPatternName) - 1;
    if (loop.endBar < maxBar) {
      onCrossPatternLoopChange({
        ...loop,
        endBar: loop.endBar + 1,
      });
    }
  };

  // 判断按钮是否禁用
  const canDecreaseStartBar = loop.startBar > 0;
  const canIncreaseStartBar = 
    loop.startBar < getPatternBars(loop.startPatternName) - 1 &&
    comparePositions(loop.startPatternName, loop.startBar + 1, loop.endPatternName, loop.endBar) <= 0;
  const canDecreaseEndBar = 
    loop.endBar > 0 &&
    comparePositions(loop.startPatternName, loop.startBar, loop.endPatternName, loop.endBar - 1) <= 0;
  const canIncreaseEndBar = loop.endBar < getPatternBars(loop.endPatternName) - 1;

  return (
    <div className="loop-range-selector">
      <div className="loop-range-controls">
        {/* 开始位置 */}
        <div className="loop-range-item">
          {/* Pattern 选择 */}
          <select
            className="loop-pattern-select"
            value={loop.startPatternName}
            onChange={(e) => handleStartPatternChange(e.target.value)}
          >
            {patternOptions.map((opt) => (
              <option key={opt.name} value={opt.name}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* 小节选择 */}
          <button
            className="loop-range-button"
            onClick={handleStartBarDecrease}
            disabled={!canDecreaseStartBar}
            aria-label="Decrease start bar"
          >
            <svg
              width="12"
              height="12"
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
          <span className="loop-range-value">{loop.startBar + 1}</span>
          <button
            className="loop-range-button"
            onClick={handleStartBarIncrease}
            disabled={!canIncreaseStartBar}
            aria-label="Increase start bar"
          >
            <svg
              width="12"
              height="12"
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

        <span className="loop-range-separator">-</span>

        {/* 结束位置 */}
        <div className="loop-range-item">
          {/* Pattern 选择 */}
          <select
            className="loop-pattern-select"
            value={loop.endPatternName}
            onChange={(e) => handleEndPatternChange(e.target.value)}
          >
            {patternOptions.map((opt) => (
              <option key={opt.name} value={opt.name}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* 小节选择 */}
          <button
            className="loop-range-button"
            onClick={handleEndBarDecrease}
            disabled={!canDecreaseEndBar}
            aria-label="Decrease end bar"
          >
            <svg
              width="12"
              height="12"
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
          <span className="loop-range-value">{loop.endBar + 1}</span>
          <button
            className="loop-range-button"
            onClick={handleEndBarIncrease}
            disabled={!canIncreaseEndBar}
            aria-label="Increase end bar"
          >
            <svg
              width="12"
              height="12"
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
      </div>
    </div>
  );
}
