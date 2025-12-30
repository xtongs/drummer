import { useState, useEffect, useRef } from "react";
import { createEmptyPattern, usePattern } from "./hooks/usePattern";
import { MetronomeBar } from "./components/MetronomeBar/MetronomeBar";
import { PatternEditor } from "./components/PatternEditor/PatternEditor";
import { BottomPlayButton } from "./components/BottomPlayButton/BottomPlayButton";
import { usePatternPlayer } from "./hooks/usePatternPlayer";
import {
  savePattern,
  loadPatterns,
  deletePattern,
  setCurrentPatternId,
  getCurrentPatternId,
  generateId,
} from "./utils/storage";
import { preInitAudioContext } from "./utils/audioEngine";
import type { Pattern } from "./types";
import "./index.css";

function App() {
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isPatternPlaying, setIsPatternPlaying] = useState(false);
  const [currentSubdivision, setCurrentSubdivision] = useState<number>(0);
  const [savedPatterns, setSavedPatterns] = useState<Pattern[]>([]);
  const {
    pattern,
    updateBPM,
    toggleCell,
    addBar,
    removeBar,
    clearGrid,
    setLoopRange,
    updateName,
    loadPattern,
  } = usePattern(createEmptyPattern());

  // 加载保存的节奏型列表并恢复上次选中的tab
  useEffect(() => {
    const patterns = loadPatterns();
    setSavedPatterns(patterns);

    // 获取上次选中的pattern ID
    const savedPatternId = getCurrentPatternId();
    if (savedPatternId) {
      // 查找对应的pattern
      const savedPattern = patterns.find((p) => p.id === savedPatternId);
      if (savedPattern) {
        // 加载上次选中的pattern
        loadPattern(savedPattern);
      } else {
        // 如果找不到，清除无效的ID
        setCurrentPatternId(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 预先初始化 AudioContext（在用户首次交互时）
  useEffect(() => {
    const handleUserInteraction = () => {
      preInitAudioContext();
      // 只需要初始化一次
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction, { once: true });
    document.addEventListener("touchstart", handleUserInteraction, {
      once: true,
    });
    document.addEventListener("keydown", handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  // 页面可见性变化时暂停播放（切换应用、标签页、弹窗等）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面被隐藏时暂停所有播放
        setIsMetronomePlaying(false);
        setIsPatternPlaying(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 节奏型播放
  usePatternPlayer({
    pattern,
    isPlaying: isPatternPlaying,
    onSubdivisionChange: setCurrentSubdivision,
  });

  const handleMetronomePlayToggle = () => {
    setIsMetronomePlaying((prev) => {
      const newValue = !prev;
      // 如果节拍器开始播放，停止节奏型播放
      if (newValue) {
        setIsPatternPlaying((patternPrev) => {
          if (patternPrev) {
            return false;
          }
          return patternPrev;
        });
      }
      return newValue;
    });
  };

  const handlePatternPlayToggle = () => {
    setIsPatternPlaying((prev) => {
      const newValue = !prev;
      // 如果节奏型开始播放，停止节拍器播放
      if (newValue) {
        setIsMetronomePlaying((metronomePrev) => {
          if (metronomePrev) {
            return false;
          }
          return metronomePrev;
        });
      }
      return newValue;
    });
  };

  // 使用 ref 来跟踪上次保存的 pattern，避免不必要的保存
  const lastSavedPatternRef = useRef<string>("");

  // 实时保存：当pattern改变且当前已选中tab时，自动保存
  useEffect(() => {
    // 检查当前pattern是否是已保存的tab
    const isSavedPattern = savedPatterns.some((p) => p.id === pattern.id);
    if (isSavedPattern) {
      // 使用 JSON.stringify 来比较 pattern 是否真的改变了
      const patternKey = JSON.stringify({
        id: pattern.id,
        bpm: pattern.bpm,
        timeSignature: pattern.timeSignature,
        bars: pattern.bars,
        grid: pattern.grid,
        loopRange: pattern.loopRange,
      });

      // 只在 pattern 真正改变时才保存
      if (patternKey !== lastSavedPatternRef.current) {
        lastSavedPatternRef.current = patternKey;
        // 实时保存当前选中的tab
        const patternToSave: Pattern = {
          ...pattern,
          updatedAt: Date.now(),
        };
        savePattern(patternToSave);
        // 更新savedPatterns列表
        setSavedPatterns(loadPatterns());
      }
    } else {
      // 如果不是已保存的 tab，重置 ref
      lastSavedPatternRef.current = "";
    }
  }, [pattern, savedPatterns]);

  const handleSave = () => {
    // 始终创建新pattern，找到下一个可用的slot编号
    const existingNumbers = savedPatterns
      .map((p) => parseInt(p.name, 10))
      .filter((n) => !isNaN(n));
    let nextSlot = 1;
    if (existingNumbers.length > 0) {
      nextSlot = Math.max(...existingNumbers) + 1;
    }

    const patternToSave: Pattern = {
      ...pattern,
      id: generateId(),
      name: String(nextSlot),
      updatedAt: Date.now(),
    };

    savePattern(patternToSave);
    setCurrentPatternId(patternToSave.id);
    // 加载保存的pattern，这样会自动选中对应的tab
    loadPattern(patternToSave);
    setSavedPatterns(loadPatterns());
  };

  const handleLoadFromSlot = (loadedPattern: Pattern) => {
    loadPattern(loadedPattern);
    setCurrentPatternId(loadedPattern.id);
  };

  const handleStopAllPlaying = () => {
    setIsMetronomePlaying(false);
    setIsPatternPlaying(false);
  };

  const handleDeletePattern = (patternId: string) => {
    deletePattern(patternId);
    if (pattern.id === patternId) {
      // 如果删除的是当前节奏型，重置为新的空节奏型
      loadPattern(createEmptyPattern());
      setCurrentPatternId(undefined);
    }
    setSavedPatterns(loadPatterns());
  };

  return (
    <div className="app">
      <MetronomeBar
        bpm={pattern.bpm}
        timeSignature={pattern.timeSignature}
        isPlaying={isPatternPlaying}
        onBPMChange={updateBPM}
        isPatternPlaying={isMetronomePlaying}
        onPatternPlayToggle={handleMetronomePlayToggle}
      />
      <main className="app-main">
        <PatternEditor
          pattern={pattern}
          onCellClick={toggleCell}
          onAddBar={addBar}
          onRemoveBar={removeBar}
          onClearGrid={clearGrid}
          onLoopRangeChange={setLoopRange}
          onSave={handleSave}
          onLoadFromSlot={handleLoadFromSlot}
          onDeletePattern={handleDeletePattern}
          onStopAllPlaying={handleStopAllPlaying}
          savedPatterns={savedPatterns}
          currentBeat={currentSubdivision}
          isPlaying={isPatternPlaying}
          onPlayToggle={handlePatternPlayToggle}
        />
      </main>
      <BottomPlayButton
        isPlaying={isPatternPlaying}
        onClick={handlePatternPlayToggle}
      />
    </div>
  );
}

export default App;
