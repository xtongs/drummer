import { useState, useEffect } from "react";
import { createEmptyPattern, usePattern } from "./hooks/usePattern";
import { useBeforeUnloadWarning } from "./hooks/useBeforeUnloadWarning";
import { useVisibilityHandler } from "./hooks/useVisibilityHandler";
import { useSampleLoader } from "./hooks/useSampleLoader";
import { useVersionShortcut } from "./hooks/useVersionShortcut";
import { usePlaybackState } from "./hooks/usePlaybackState";
import { MetronomeBar } from "./components/MetronomeBar/MetronomeBar";
import { PatternEditor } from "./components/PatternEditor/PatternEditor";
import { BottomPlayButton } from "./components/BottomPlayButton/BottomPlayButton";
import { VersionDisplay } from "./components/VersionDisplay/VersionDisplay";
import { useMultiPatternPlayer } from "./hooks/useMultiPatternPlayer";
import {
  savePattern,
  loadPatterns,
  deletePattern,
  setCurrentPatternId,
  generateId,
  saveMetronomeBPM,
  loadMetronomeBPM,
  saveCrossPatternLoop,
  loadCrossPatternLoop,
  parsePatternFromJSON,
  getNextPatternName,
} from "./utils/storage";
import {
  DEFAULT_BPM,
  DEFAULT_BARS,
  DEFAULT_TIME_SIGNATURE,
  BPM_RATES,
  BPM_RATE_LABELS,
  calculateCumulativeRate,
} from "./utils/constants";
import type { TimeSignature } from "./types";
import type { Pattern, CrossPatternLoop } from "./types";
import "./index.css";

function App() {
  // 采样加载
  const { isLoading, loadingProgress, showProgress } = useSampleLoader();

  // 播放状态管理
  const {
    isMetronomePlaying,
    isPatternPlaying,
    toggleMetronomePlay,
    togglePatternPlay,
    stopAll,
    setIsMetronomePlaying,
    setIsPatternPlaying,
  } = usePlaybackState();

  const [currentSubdivision, setCurrentSubdivision] = useState<number>(0);
  const [savedPatterns, setSavedPatterns] = useState<Pattern[]>([]);
  // 草稿模式：当前编辑的 pattern 不保存到本地
  const [isDraftMode, setIsDraftMode] = useState(true);
  // 节拍器独立 BPM（与 pattern 分开存储）
  const [metronomeBPM, setMetronomeBPM] = useState<number>(() => {
    return loadMetronomeBPM() ?? DEFAULT_BPM;
  });
  // 节拍器独立拍号（与 pattern 分开存储）
  const [metronomeTimeSignature, setMetronomeTimeSignature] =
    useState<TimeSignature>(DEFAULT_TIME_SIGNATURE);
  // BPM rate index（控制 x0.9, x0.8 等变速状态）
  const [rateIndex, setRateIndex] = useState<number>(0);
  // 跨 Pattern 循环范围（从本地存储加载初始值）
  const [crossPatternLoop, setCrossPatternLoop] = useState<
    CrossPatternLoop | undefined
  >(
    () =>
      loadCrossPatternLoop() ?? {
        startPatternName: "",
        startBar: 0,
        endPatternName: "",
        endBar: DEFAULT_BARS - 1,
      }
  );
  const {
    pattern,
    updateBPM,
    toggleCell,
    toggleGhost,
    cycleThirtySecond,
    addBar,
    removeBar,
    clearGrid,
    loadPattern,
    resetPattern,
  } = usePattern(createEmptyPattern());

  // 当 BPM 改变时，同时更新节拍器和节奏型的 BPM
  // 如果 shouldSave=false（如切换 rate 时），只更新显示用的 metronomeBPM，不更新 pattern.bpm
  // 这样 pattern.bpm 保持原始值，playbackRate 会在 useMultiPatternPlayer 中应用
  const handleBPMChange = (bpm: number, shouldSave = true) => {
    setMetronomeBPM(bpm);
    if (shouldSave) {
      saveMetronomeBPM(bpm);
      updateBPM(bpm);
    }
  };

  // 节拍器拍号改变（只影响节拍器，不影响节奏型）
  const handleMetronomeTimeSignatureChange = (timeSignature: TimeSignature) => {
    setMetronomeTimeSignature(timeSignature);
  };

  // 选择草稿模式
  const handleSelectDraft = () => {
    // 如果正在播放，停止播放
    if (isPatternPlaying) {
      setIsPatternPlaying(false);
    }

    // 停止节拍器播放
    if (isMetronomePlaying) {
      setIsMetronomePlaying(false);
    }

    // 重置 BPM rate
    setRateIndex(0);

    setIsDraftMode(true);
    setCurrentPatternId(undefined);
    resetPattern();
    // 同步 BPM 到节拍器（使用默认BPM）
    setMetronomeBPM(DEFAULT_BPM);
    saveMetronomeBPM(DEFAULT_BPM);
    updateBPM(DEFAULT_BPM);

    // 设置 range 为草稿的完整范围
    setCrossPatternLoop({
      startPatternName: "",
      startBar: 0,
      endPatternName: "",
      endBar: DEFAULT_BARS - 1,
    });
  };

  // 页面刷新时默认选中 draft tab，不自动恢复上次选中的 pattern
  useEffect(() => {
    const patterns = loadPatterns();
    setSavedPatterns(patterns);

    // 不自动恢复上次选中的 pattern，始终保持 draft mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 crossPatternLoop 改变时保存到本地存储
  useEffect(() => {
    saveCrossPatternLoop(crossPatternLoop);
  }, [crossPatternLoop]);

  // 页面可见性变化时暂停/恢复播放（切换应用、标签页、弹窗等）
  useVisibilityHandler({
    isMetronomePlaying,
    isPatternPlaying,
    setIsMetronomePlaying,
    setIsPatternPlaying,
  });

  // 防误触退出：播放时阻止页面关闭
  useBeforeUnloadWarning(isMetronomePlaying, isPatternPlaying);

  // 快速点击body空白区域5次显示版本号
  useVersionShortcut();

  // 阻止右键菜单(在移动端模拟器中长按时)
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      return false;
    };

    document.body.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.body.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // 阻止移动端双指缩放和触摸手势
  useEffect(() => {
    const preventTouchMove = (event: TouchEvent) => {
      // 如果是双指触摸(缩放手势),阻止默认行为
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const preventGestureStart = (event: Event) => {
      event.preventDefault();
    };

    // 阻止双指缩放
    document.body.addEventListener('touchmove', preventTouchMove, { passive: false });
    // 阻止 iOS Safari 的缩放和滚动手势
    document.body.addEventListener('gesturestart', preventGestureStart, { passive: false });

    return () => {
      document.body.removeEventListener('touchmove', preventTouchMove);
      document.body.removeEventListener('gesturestart', preventGestureStart);
    };
  }, []);

  // 播放时切换 pattern 的回调
  const handlePlayingPatternChange = (patternName: string) => {
    if (patternName === "") {
      // 切换到草稿
      setIsDraftMode(true);
      setCurrentPatternId(undefined);
      // 如果有 rate 设置，应用到显示的 BPM，但保存原始 BPM
      const cumulativeRate = calculateCumulativeRate(rateIndex);
      const newBPM = pattern.bpm * cumulativeRate;
      setMetronomeBPM(newBPM);
      saveMetronomeBPM(pattern.bpm); // 保存原始 BPM
    } else {
      // 切换到保存的 pattern
      const targetPattern = savedPatterns.find((p) => p.name === patternName);
      if (targetPattern) {
        // 只有真正切换到不同的pattern时，才更新BPM
        if (targetPattern.id !== pattern.id) {
          setIsDraftMode(false);
          loadPattern(targetPattern);
          setCurrentPatternId(targetPattern.id);
          // 如果有 rate 设置，应用到显示的 BPM，但保存原始 BPM
          const cumulativeRate = calculateCumulativeRate(rateIndex);
          const newBPM = targetPattern.bpm * cumulativeRate;
          setMetronomeBPM(newBPM);
          saveMetronomeBPM(targetPattern.bpm); // 保存原始 BPM
        }
        // 如果是同一个pattern循环播放，保持当前BPM不变
      }
    }
  };

  // 节奏型播放（支持跨 pattern 循环）
  const { seekTo } = useMultiPatternPlayer({
    currentPattern: pattern,
    savedPatterns,
    crossPatternLoop,
    isPlaying: isPatternPlaying,
    isDraftMode,
    playbackRate: calculateCumulativeRate(rateIndex),
    onSubdivisionChange: setCurrentSubdivision,
    onPatternChange: handlePlayingPatternChange,
  });

  // 处理长按底部播放按钮，重置播放游标到开头
  const handleBottomPlayButtonLongPress = () => {
    if (!isPatternPlaying) {
      seekTo(0);
    }
  };

  // 处理鼓谱区域双击事件
  const handleNotationDoubleClick = (subdivision: number) => {
    seekTo(subdivision);
  };

  // 保存当前正在编辑的 pattern（非草稿模式下）
  const handleSaveCurrentPattern = () => {
    if (isDraftMode) return;

    const patternToSave: Pattern = {
      ...pattern,
      updatedAt: Date.now(),
    };
    savePattern(patternToSave);
    setSavedPatterns(loadPatterns());
  };

  const handleSave = () => {
    const nextLetter = getNextPatternName(savedPatterns);

    const patternToSave: Pattern = {
      ...pattern,
      id: generateId(),
      name: nextLetter,
      updatedAt: Date.now(),
    };

    savePattern(patternToSave);
    setIsDraftMode(false); // 保存后退出草稿模式
    setCurrentPatternId(patternToSave.id);
    // 加载保存的pattern，这样会自动选中对应的tab
    loadPattern(patternToSave);
    setSavedPatterns(loadPatterns());
  };

  const handleLoadFromSlot = (loadedPattern: Pattern) => {
    // 如果正在播放，停止播放
    if (isPatternPlaying) {
      setIsPatternPlaying(false);
    }

    // 停止节拍器播放
    if (isMetronomePlaying) {
      setIsMetronomePlaying(false);
    }

    // 检查当前是否有跨 pattern 的 range 设置，且新 pattern 在范围内
    const isInCrossPatternRange = (() => {
      if (!crossPatternLoop) return false;
      const { startPatternName, endPatternName } = crossPatternLoop;
      // 如果起始和结束是同一个 pattern，不算跨 pattern
      if (startPatternName === endPatternName) return false;

      // 获取所有 pattern 的排序列表（按字母顺序）
      const sortedPatternNames = [...savedPatterns]
        .map((p) => p.name)
        .sort((a, b) => a.localeCompare(b));

      // 添加草稿模式（空字符串）到最前面
      const allPatternNames = ["", ...sortedPatternNames];

      const startIndex = allPatternNames.indexOf(startPatternName);
      const endIndex = allPatternNames.indexOf(endPatternName);
      const loadedIndex = allPatternNames.indexOf(loadedPattern.name);

      // 检查新 pattern 是否在范围内
      return loadedIndex >= startIndex && loadedIndex <= endIndex;
    })();

    // 如果新 pattern 在跨 pattern range 内，保持 rate 不变；否则重置
    if (!isInCrossPatternRange) {
      setRateIndex(0);
    }

    setIsDraftMode(false);
    loadPattern(loadedPattern);
    setCurrentPatternId(loadedPattern.id);

    // 如果在跨 pattern range 内且有 rate 设置，应用 rate 到显示的 BPM
    if (isInCrossPatternRange && rateIndex > 0) {
      const cumulativeRate = calculateCumulativeRate(rateIndex);
      const newBPM = loadedPattern.bpm * cumulativeRate;
      setMetronomeBPM(newBPM);
      saveMetronomeBPM(loadedPattern.bpm); // 保存原始 BPM
      // 注意：不要用 newBPM 更新 pattern.bpm，pattern.bpm 应该保持原始值
      // playbackRate 会在 useMultiPatternPlayer 中统一应用
    } else {
      // 同步 BPM 到节拍器
      setMetronomeBPM(loadedPattern.bpm);
      saveMetronomeBPM(loadedPattern.bpm);
    }
    // loadPattern 已经设置了正确的 pattern.bpm，不需要再调用 updateBPM

    // 如果在跨 pattern range 内，保持 range 不变；否则设置为该节奏型的完整范围
    if (!isInCrossPatternRange) {
      setCrossPatternLoop({
        startPatternName: loadedPattern.name,
        startBar: 0,
        endPatternName: loadedPattern.name,
        endBar: loadedPattern.bars - 1,
      });
    }
  };

  const handleDeletePattern = (patternId: string) => {
    deletePattern(patternId);
    if (pattern.id === patternId) {
      // 如果删除的是当前节奏型，进入草稿模式
      setIsDraftMode(true);
      resetPattern();
      setCurrentPatternId(undefined);
    }
    setSavedPatterns(loadPatterns());
  };

  // 从 JSON 字符串导入 pattern 数据并创建新 tab
  const handleImportPattern = (jsonString: string) => {
    const importedPattern = parsePatternFromJSON(jsonString);
    if (!importedPattern) {
      console.log("Invalid pattern data");
      return;
    }

    const nextLetter = getNextPatternName(savedPatterns);
    const now = Date.now();
    const newPattern: Pattern = {
      ...importedPattern,
      id: generateId(),
      name: nextLetter,
      createdAt: now,
      updatedAt: now,
    };

    // 保存并切换到新 pattern
    savePattern(newPattern);
    setIsDraftMode(false);
    loadPattern(newPattern);
    setCurrentPatternId(newPattern.id);
    setMetronomeBPM(newPattern.bpm);
    saveMetronomeBPM(newPattern.bpm);
    updateBPM(newPattern.bpm);
    setSavedPatterns(loadPatterns());

    // 设置 range 为新节奏型的完整范围
    setCrossPatternLoop({
      startPatternName: newPattern.name,
      startBar: 0,
      endPatternName: newPattern.name,
      endBar: newPattern.bars - 1,
    });

    console.log("Pattern imported successfully");
  };

  // 加载中显示加载界面
  if (isLoading) {
    const progressPercent = Math.round(
      (loadingProgress.loaded / loadingProgress.total) * 100
    );
    return (
      <div className="app loading">
        <div className="loading-container">
          {showProgress && (
            <div className="loading-progress">
              <div className="loading-progress-bar">
                <div
                  className="loading-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <MetronomeBar
        bpm={metronomeBPM}
        timeSignature={metronomeTimeSignature}
        isPlaying={isPatternPlaying}
        onBPMChange={handleBPMChange}
        isPatternPlaying={isMetronomePlaying}
        onPatternPlayToggle={toggleMetronomePlay}
        onTimeSignatureChange={handleMetronomeTimeSignatureChange}
        rateIndex={rateIndex}
        onRateIndexChange={setRateIndex}
        rates={BPM_RATES}
        rateLabels={BPM_RATE_LABELS}
      />
      <main className="app-main">
        <PatternEditor
          pattern={pattern}
          onCellClick={toggleCell}
          onToggleGhost={toggleGhost}
          onCycleThirtySecond={cycleThirtySecond}
          onAddBar={addBar}
          onRemoveBar={removeBar}
          onClearGrid={clearGrid}
          crossPatternLoop={crossPatternLoop}
          onCrossPatternLoopChange={setCrossPatternLoop}
          onSave={handleSave}
          onSaveCurrentPattern={handleSaveCurrentPattern}
          onImportPattern={handleImportPattern}
          onLoadFromSlot={handleLoadFromSlot}
          onDeletePattern={handleDeletePattern}
          onStopAllPlaying={stopAll}
          onSelectDraft={handleSelectDraft}
          savedPatterns={savedPatterns}
          currentBeat={currentSubdivision}
          isPlaying={isPatternPlaying}
          onPlayToggle={togglePatternPlay}
          isDraftMode={isDraftMode}
          onNotationDoubleClick={handleNotationDoubleClick}
        />
      </main>
      <BottomPlayButton
        isPlaying={isPatternPlaying}
        onClick={togglePatternPlay}
        onLongPress={handleBottomPlayButtonLongPress}
      />
      <VersionDisplay />
    </div>
  );
}

export default App;
