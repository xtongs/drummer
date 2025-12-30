import { useEffect, useRef, useCallback } from "react";
import type { Pattern, CellState, CrossPatternLoop } from "../types";
import { CELL_OFF, CELL_GHOST } from "../types";
import { SUBDIVISIONS_PER_BEAT } from "../utils/constants";
import {
  playKick,
  playSnare,
  playHiHatClosed,
  playHiHatOpen,
  playCrash,
  playRide,
  playTom,
  getAudioContext,
  setVolumeMultiplier,
  resetVolumeMultiplier,
} from "../utils/audioEngine";

// WakeLock 管理
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      // WakeLock request failed
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch {
      // WakeLock release failed
    }
  }
}

function scheduleAnimationUpdate(
  subdivision: number,
  callback: (subdivision: number) => void,
  delayMs: number
) {
  const timeoutDelay = Math.max(0, delayMs);
  setTimeout(() => {
    requestAnimationFrame(() => {
      callback(subdivision);
    });
  }, timeoutDelay);
}

// 播放序列中的一个步骤
interface PlayStep {
  patternName: string;
  pattern: Pattern;
  startBar: number;
  endBar: number;
}

interface UseMultiPatternPlayerOptions {
  currentPattern: Pattern; // 当前编辑的 pattern（草稿或已保存）
  savedPatterns: Pattern[];
  crossPatternLoop: CrossPatternLoop | undefined;
  isPlaying: boolean;
  isDraftMode: boolean;
  onSubdivisionChange?: (subdivision: number) => void;
  onPatternChange?: (patternName: string) => void;
}

export function useMultiPatternPlayer({
  currentPattern,
  savedPatterns,
  crossPatternLoop,
  isPlaying,
  isDraftMode,
  onSubdivisionChange,
  onPatternChange,
}: UseMultiPatternPlayerOptions) {
  const nextNoteTimeRef = useRef<number>(0);
  const scheduleAheadTimeRef = useRef<number>(0.1);
  const lookaheadRef = useRef<number>(25);
  const schedulerIntervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);

  // 当前播放位置
  const currentStepIndexRef = useRef<number>(0);
  const currentSubdivisionInStepRef = useRef<number>(0);

  // 使用 ref 存储动态数据
  const playStepsRef = useRef<PlayStep[]>([]);
  const subdivisionDurationRef = useRef<number>(0);
  const onSubdivisionChangeRef = useRef(onSubdivisionChange);
  const onPatternChangeRef = useRef(onPatternChange);

  onSubdivisionChangeRef.current = onSubdivisionChange;
  onPatternChangeRef.current = onPatternChange;

  // 构建播放序列
  const buildPlaySteps = useCallback((): PlayStep[] => {
    const steps: PlayStep[] = [];

    if (!crossPatternLoop) {
      // 没有跨 pattern 循环，使用当前 pattern 的全部
      steps.push({
        patternName: isDraftMode ? "" : currentPattern.name,
        pattern: currentPattern,
        startBar: 0,
        endBar: currentPattern.bars - 1,
      });
      return steps;
    }

    const { startPatternName, startBar, endPatternName, endBar } = crossPatternLoop;

    // 按字母顺序获取从 start 到 end 的所有 patterns
    const sortedPatterns = [...savedPatterns].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // 如果是草稿模式，添加草稿 pattern 到列表最前面
    // 如果不是草稿模式，但当前编辑的 pattern 在循环范围内，使用当前编辑的 pattern 替换 savedPatterns 中的版本
    const allPatterns: { name: string; pattern: Pattern }[] = isDraftMode
      ? [{ name: "", pattern: currentPattern }, ...sortedPatterns.map((p) => ({ name: p.name, pattern: p }))]
      : sortedPatterns.map((p) => {
          // 如果当前编辑的 pattern 名称匹配，使用当前编辑的版本（未保存的更改）
          if (p.name === currentPattern.name && p.id === currentPattern.id) {
            return { name: p.name, pattern: currentPattern };
          }
          return { name: p.name, pattern: p };
        });

    // 找到开始和结束的索引
    const startIndex = allPatterns.findIndex((p) => p.name === startPatternName);
    const endIndex = allPatterns.findIndex((p) => p.name === endPatternName);

    if (startIndex === -1 || endIndex === -1) {
      // 找不到 pattern，使用当前 pattern
      steps.push({
        patternName: isDraftMode ? "" : currentPattern.name,
        pattern: currentPattern,
        startBar: 0,
        endBar: currentPattern.bars - 1,
      });
      return steps;
    }

    // 从 startIndex 到 endIndex 构建播放序列
    for (let i = startIndex; i <= endIndex; i++) {
      const { name, pattern } = allPatterns[i];
      const stepStartBar = i === startIndex ? startBar : 0;
      const stepEndBar = i === endIndex ? endBar : pattern.bars - 1;

      steps.push({
        patternName: name,
        pattern,
        startBar: stepStartBar,
        endBar: stepEndBar,
      });
    }

    return steps;
  }, [currentPattern, savedPatterns, crossPatternLoop, isDraftMode]);

  // 计算时间参数（使用当前 pattern 的 BPM）
  const [beatsPerBar] = currentPattern.timeSignature;
  const beatDuration = (60.0 / currentPattern.bpm) * (4.0 / currentPattern.timeSignature[1]);
  const subdivisionDuration = beatDuration / SUBDIVISIONS_PER_BEAT;
  const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

  subdivisionDurationRef.current = subdivisionDuration;

  // 更新播放序列
  useEffect(() => {
    playStepsRef.current = buildPlaySteps();
  }, [buildPlaySteps]);

  // 播放单个 subdivision
  const playSubdivision = useCallback(
    (pattern: Pattern, subdivisionIndex: number, time: number) => {
      pattern.grid.forEach((row, drumIndex) => {
        const cellState: CellState = row[subdivisionIndex];
        if (cellState !== CELL_OFF) {
          const drum = pattern.drums[drumIndex];
          const playTime = time;

          const volumeMultiplier = cellState === CELL_GHOST ? 0.3 : 1;
          setVolumeMultiplier(volumeMultiplier);

          switch (drum) {
            case "Kick":
              playKick(playTime);
              break;
            case "Snare":
              playSnare(playTime);
              break;
            case "Hi-Hat Closed":
              playHiHatClosed(playTime);
              break;
            case "Hi-Hat Open":
              playHiHatOpen(playTime);
              break;
            case "Crash 1":
              playCrash(playTime, 1.2);
              break;
            case "Crash 2":
              playCrash(playTime, 1.0);
              break;
            case "Ride":
              playRide(playTime);
              break;
            case "Tom 1":
              playTom(playTime, 250);
              break;
            case "Tom 2":
              playTom(playTime, 200);
              break;
            case "Tom 3":
              playTom(playTime, 150);
              break;
          }

          resetVolumeMultiplier();
        }
      });
    },
    []
  );

  // 调度器函数
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    if (!isRunningRef.current) return;

    const currentTime = ctx.currentTime;
    const steps = playStepsRef.current;
    const subDuration = subdivisionDurationRef.current;

    if (steps.length === 0) return;

    while (
      nextNoteTimeRef.current <
      currentTime + scheduleAheadTimeRef.current
    ) {
      let stepIndex = currentStepIndexRef.current;
      let subInStep = currentSubdivisionInStepRef.current;

      // 获取当前步骤
      if (stepIndex >= steps.length) {
        // 循环回到开始
        stepIndex = 0;
        subInStep = steps[0].startBar * subdivisionsPerBar;
        currentStepIndexRef.current = 0;
        currentSubdivisionInStepRef.current = subInStep;

        // 通知 pattern 变化
        const callback = onPatternChangeRef.current;
        if (callback) {
          callback(steps[0].patternName);
        }

        if (nextNoteTimeRef.current < currentTime) {
          nextNoteTimeRef.current = currentTime;
        }
        continue;
      }

      const step = steps[stepIndex];
      const stepStartSub = step.startBar * subdivisionsPerBar;
      const stepEndSub = (step.endBar + 1) * subdivisionsPerBar;

      // 检查是否超出当前步骤范围
      if (subInStep >= stepEndSub) {
        // 移动到下一个步骤
        currentStepIndexRef.current = stepIndex + 1;
        if (stepIndex + 1 < steps.length) {
          const nextStep = steps[stepIndex + 1];
          currentSubdivisionInStepRef.current = nextStep.startBar * subdivisionsPerBar;

          // 通知 pattern 变化
          const callback = onPatternChangeRef.current;
          if (callback) {
            callback(nextStep.patternName);
          }
        }
        continue;
      }

      // 确保在步骤范围内
      if (subInStep < stepStartSub) {
        subInStep = stepStartSub;
        currentSubdivisionInStepRef.current = stepStartSub;
      }

      const playTime = Math.max(nextNoteTimeRef.current, currentTime);
      const delayMs = (playTime - currentTime) * 1000;

      // 播放当前 subdivision
      playSubdivision(step.pattern, subInStep, playTime);

      // 更新动画状态
      const callback = onSubdivisionChangeRef.current;
      if (callback) {
        scheduleAnimationUpdate(subInStep, callback, delayMs);
      }

      currentSubdivisionInStepRef.current = subInStep + 1;
      nextNoteTimeRef.current += subDuration;
    }
  }, [playSubdivision, subdivisionsPerBar]);

  // 开始播放
  const start = useCallback(async () => {
    const ctx = getAudioContext();
    if (isRunningRef.current) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));

    requestWakeLock();

    isRunningRef.current = true;
    const currentTime = ctx.currentTime;
    const steps = playStepsRef.current;

    if (steps.length === 0) return;

    // 重置到开始位置
    currentStepIndexRef.current = 0;
    currentSubdivisionInStepRef.current = steps[0].startBar * subdivisionsPerBar;

    // 通知初始 pattern
    const callback = onPatternChangeRef.current;
    if (callback) {
      callback(steps[0].patternName);
    }

    const subCallback = onSubdivisionChangeRef.current;
    if (subCallback) {
      scheduleAnimationUpdate(steps[0].startBar * subdivisionsPerBar, subCallback, 0);
    }

    nextNoteTimeRef.current = currentTime;
    scheduler();

    schedulerIntervalRef.current = window.setInterval(
      scheduler,
      lookaheadRef.current
    );
  }, [scheduler, subdivisionsPerBar]);

  // 停止播放
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerIntervalRef.current !== null) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    releaseWakeLock();
  }, []);

  // 根据 isPlaying 状态控制播放
  useEffect(() => {
    if (isPlaying) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [isPlaying, start, stop]);

  // 当 BPM 改变时重置播放器
  useEffect(() => {
    if (isPlaying) {
      stop();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPattern.bpm]);
}

