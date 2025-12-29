import { useState, useEffect } from "react";
import { createEmptyPattern, usePattern } from "./hooks/usePattern";
import { MetronomeBar } from "./components/MetronomeBar/MetronomeBar";
import { PatternEditor } from "./components/PatternEditor/PatternEditor";
import { useMetronome } from "./hooks/useMetronome";
import { usePatternPlayer } from "./hooks/usePatternPlayer";
import {
  savePattern,
  loadPatterns,
  deletePattern,
  setCurrentPatternId,
  generateId,
} from "./utils/storage";
import type { Pattern } from "./types";
import "./index.css";

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
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

  // 加载保存的节奏型列表
  useEffect(() => {
    setSavedPatterns(loadPatterns());
  }, []);

  // 节拍器可视化（四个点）
  useMetronome({
    bpm: pattern.bpm,
    timeSignature: pattern.timeSignature,
    isPlaying,
  });

  // 节奏型播放
  usePatternPlayer({
    pattern,
    isPlaying,
    onSubdivisionChange: setCurrentSubdivision,
  });

  const handlePlayToggle = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSave = () => {
    // 找到下一个可用的slot编号
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
    updateName(String(nextSlot));
    setSavedPatterns(loadPatterns());
  };

  const handleLoadFromSlot = (loadedPattern: Pattern) => {
    loadPattern(loadedPattern);
    setCurrentPatternId(loadedPattern.id);
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
        isPlaying={isPlaying}
        onBPMChange={updateBPM}
        onPlayToggle={handlePlayToggle}
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
          savedPatterns={savedPatterns}
          currentBeat={currentSubdivision}
        />
      </main>
    </div>
  );
}

export default App;
