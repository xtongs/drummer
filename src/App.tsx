import { useState, useEffect, useRef } from "react";
import { createEmptyPattern, usePattern } from "./hooks/usePattern";
import { MetronomeBar } from "./components/MetronomeBar/MetronomeBar";
import { PatternEditor } from "./components/PatternEditor/PatternEditor";
import { BottomPlayButton } from "./components/BottomPlayButton/BottomPlayButton";
import { useMultiPatternPlayer } from "./hooks/useMultiPatternPlayer";
import {
  savePattern,
  loadPatterns,
  deletePattern,
  setCurrentPatternId,
  getCurrentPatternId,
  generateId,
  saveMetronomeBPM,
  loadMetronomeBPM,
  saveCrossPatternLoop,
  loadCrossPatternLoop,
} from "./utils/storage";
import { DEFAULT_BPM } from "./utils/constants";
import { preInitAudioContext, resumeAudioContext } from "./utils/audioEngine";
import type { Pattern, CrossPatternLoop } from "./types";
import "./index.css";

function App() {
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isPatternPlaying, setIsPatternPlaying] = useState(false);
  const [currentSubdivision, setCurrentSubdivision] = useState<number>(0);
  const [savedPatterns, setSavedPatterns] = useState<Pattern[]>([]);
  // 草稿模式：当前编辑的 pattern 不保存到本地
  const [isDraftMode, setIsDraftMode] = useState(true);
  // 节拍器独立 BPM（与 pattern 分开存储）
  const [metronomeBPM, setMetronomeBPM] = useState<number>(() => {
    return loadMetronomeBPM() ?? DEFAULT_BPM;
  });
  // BPM 速率倍数
  const [bpmRate, setBpmRate] = useState<number>(1);
  // 跨 Pattern 循环范围（从本地存储加载初始值）
  const [crossPatternLoop, setCrossPatternLoop] = useState<
    CrossPatternLoop | undefined
  >(() => loadCrossPatternLoop());

  // 计算实际播放 BPM
  const actualBPM = Math.round(metronomeBPM * bpmRate);
  const {
    pattern,
    updateBPM,
    toggleCell,
    toggleGhost,
    addBar,
    removeBar,
    clearGrid,
    loadPattern,
    resetPattern,
  } = usePattern(createEmptyPattern());

  // 当 BPM 改变时，同时更新节拍器和节奏型的 BPM
  const handleBPMChange = (bpm: number) => {
    setMetronomeBPM(bpm);
    saveMetronomeBPM(bpm);
    // 使用实际 BPM 更新 pattern
    const newActualBPM = Math.round(bpm * bpmRate);
    updateBPM(newActualBPM);
  };

  // 当速率改变时，更新 pattern 的 BPM
  const handleBpmRateChange = (rate: number) => {
    setBpmRate(rate);
    const newActualBPM = Math.round(metronomeBPM * rate);
    updateBPM(newActualBPM);
  };

  // 选择草稿模式
  const handleSelectDraft = () => {
    setIsDraftMode(true);
    setCurrentPatternId(undefined);
    resetPattern();
  };

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
        setIsDraftMode(false);
        loadPattern(savedPattern);
        // 同步 BPM 到节拍器（优先使用已保存的节拍器 BPM）
        const savedBPM = loadMetronomeBPM();
        if (savedBPM !== null) {
          // 使用保存的节拍器 BPM 更新 pattern
          setMetronomeBPM(savedBPM);
        } else {
          // 没有保存的节拍器 BPM，使用 pattern 的 BPM
          setMetronomeBPM(savedPattern.bpm);
          saveMetronomeBPM(savedPattern.bpm);
        }
      } else {
        // 如果找不到，清除无效的ID
        setCurrentPatternId(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 crossPatternLoop 改变时保存到本地存储
  useEffect(() => {
    saveCrossPatternLoop(crossPatternLoop);
  }, [crossPatternLoop]);

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

  // 使用 ref 记住隐藏前的播放状态
  const wasMetronomePlayingRef = useRef(false);
  const wasPatternPlayingRef = useRef(false);
  // 使用 ref 存储当前播放状态，避免闭包问题
  const isMetronomePlayingRef = useRef(isMetronomePlaying);
  const isPatternPlayingRef = useRef(isPatternPlaying);

  // 同步更新 ref 中的播放状态
  useEffect(() => {
    isMetronomePlayingRef.current = isMetronomePlaying;
  }, [isMetronomePlaying]);

  useEffect(() => {
    isPatternPlayingRef.current = isPatternPlaying;
  }, [isPatternPlaying]);

  // 页面可见性变化时暂停/恢复播放（切换应用、标签页、弹窗等）
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // 页面被隐藏时，记住当前播放状态并暂停所有播放
        wasMetronomePlayingRef.current = isMetronomePlayingRef.current;
        wasPatternPlayingRef.current = isPatternPlayingRef.current;
        setIsMetronomePlaying(false);
        setIsPatternPlaying(false);
      } else {
        // 页面重新可见时，恢复 AudioContext 并恢复之前的播放状态
        try {
          await resumeAudioContext();
          // 恢复之前的播放状态
          if (wasMetronomePlayingRef.current) {
            setIsMetronomePlaying(true);
          }
          if (wasPatternPlayingRef.current) {
            setIsPatternPlaying(true);
          }
        } catch (error) {
          // 如果恢复失败，忽略错误
          console.error("Failed to resume audio context:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 防误触退出：播放时阻止页面关闭
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 如果正在播放，显示确认对话框
      if (isMetronomePlayingRef.current || isPatternPlayingRef.current) {
        // 现代浏览器会忽略自定义消息，只显示默认消息
        e.preventDefault();
        // 为了兼容性，需要设置 returnValue
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 播放时切换 pattern 的回调
  const handlePlayingPatternChange = (patternName: string) => {
    if (patternName === "") {
      // 切换到草稿
      setIsDraftMode(true);
      setCurrentPatternId(undefined);
    } else {
      // 切换到保存的 pattern
      const targetPattern = savedPatterns.find((p) => p.name === patternName);
      if (targetPattern && targetPattern.id !== pattern.id) {
        setIsDraftMode(false);
        loadPattern(targetPattern);
        setCurrentPatternId(targetPattern.id);
      }
    }
  };

  // 节奏型播放（支持跨 pattern 循环）
  useMultiPatternPlayer({
    currentPattern: pattern,
    savedPatterns,
    crossPatternLoop,
    isPlaying: isPatternPlaying,
    isDraftMode,
    onSubdivisionChange: setCurrentSubdivision,
    onPatternChange: handlePlayingPatternChange,
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
    // 始终创建新pattern，找到下一个可用的字母（A-Z）
    const existingLetters = savedPatterns
      .map((p) => p.name)
      .filter((name) => /^[A-Z]$/.test(name));

    // 找到下一个可用的字母
    let nextLetter = "A";
    if (existingLetters.length > 0) {
      // 找出已使用的字母，获取下一个
      const usedCodes = existingLetters.map((l) => l.charCodeAt(0));
      const maxCode = Math.max(...usedCodes);
      // 如果还没超过 Z，使用下一个字母
      if (maxCode < 90) {
        nextLetter = String.fromCharCode(maxCode + 1);
      } else {
        // 如果已经到 Z，找第一个未使用的字母
        for (let code = 65; code <= 90; code++) {
          if (!usedCodes.includes(code)) {
            nextLetter = String.fromCharCode(code);
            break;
          }
        }
      }
    }

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
    setIsDraftMode(false);
    loadPattern(loadedPattern);
    setCurrentPatternId(loadedPattern.id);
    // 同步 BPM 到节拍器
    setMetronomeBPM(loadedPattern.bpm);
    saveMetronomeBPM(loadedPattern.bpm);
  };

  const handleStopAllPlaying = () => {
    setIsMetronomePlaying(false);
    setIsPatternPlaying(false);
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

  return (
    <div className="app">
      <MetronomeBar
        bpm={metronomeBPM}
        actualBpm={actualBPM}
        timeSignature={pattern.timeSignature}
        isPlaying={isPatternPlaying}
        onBPMChange={handleBPMChange}
        isPatternPlaying={isMetronomePlaying}
        onPatternPlayToggle={handleMetronomePlayToggle}
      />
      <main className="app-main">
        <PatternEditor
          pattern={pattern}
          onCellClick={toggleCell}
          onToggleGhost={toggleGhost}
          onAddBar={addBar}
          onRemoveBar={removeBar}
          onClearGrid={clearGrid}
          crossPatternLoop={crossPatternLoop}
          onCrossPatternLoopChange={setCrossPatternLoop}
          onSave={handleSave}
          onSaveCurrentPattern={handleSaveCurrentPattern}
          onLoadFromSlot={handleLoadFromSlot}
          onDeletePattern={handleDeletePattern}
          onStopAllPlaying={handleStopAllPlaying}
          onSelectDraft={handleSelectDraft}
          savedPatterns={savedPatterns}
          currentBeat={currentSubdivision}
          isPlaying={isPatternPlaying}
          onPlayToggle={handlePatternPlayToggle}
          isDraftMode={isDraftMode}
        />
      </main>
      <BottomPlayButton
        isPlaying={isPatternPlaying}
        onClick={handlePatternPlayToggle}
        bpmRate={bpmRate}
        onBpmRateChange={handleBpmRateChange}
      />
    </div>
  );
}

export default App;
