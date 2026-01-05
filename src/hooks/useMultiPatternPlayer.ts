import { useEffect, useRef, useCallback } from "react";
import type { Pattern, CellState, CrossPatternLoop } from "../types";
import {
  CELL_OFF,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../types";
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

let lastAnimationUpdateTime = 0;
const ANIMATION_THROTTLE = 16;

function scheduleAnimationUpdate(
  subdivision: number,
  callback: (subdivision: number) => void,
  delayMs: number
) {
  const timeoutDelay = Math.max(0, delayMs);
  setTimeout(() => {
    const now = Date.now();
    if (now - lastAnimationUpdateTime >= ANIMATION_THROTTLE) {
      requestAnimationFrame(() => {
        lastAnimationUpdateTime = Date.now();
        callback(subdivision);
      });
    } else {
      callback(subdivision);
    }
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
  const scheduleAheadTimeRef = useRef<number>(0.2);
  const lookaheadRef = useRef<number>(50);
  const schedulerIntervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);

  // 当前播放位置
  const currentStepIndexRef = useRef<number>(0);
  const currentSubdivisionInStepRef = useRef<number>(0);

  // 使用 ref 存储动态数据
  const playStepsRef = useRef<PlayStep[]>([]);
  const onSubdivisionChangeRef = useRef(onSubdivisionChange);
  const onPatternChangeRef = useRef(onPatternChange);
  const currentPatternRef = useRef(currentPattern);
  const isDraftModeRef = useRef(isDraftMode);

  onSubdivisionChangeRef.current = onSubdivisionChange;
  onPatternChangeRef.current = onPatternChange;
  currentPatternRef.current = currentPattern;
  isDraftModeRef.current = isDraftMode;

  // 计算指定 pattern 的 subdivision 时长
  const getSubdivisionDuration = useCallback((pattern: Pattern): number => {
    const beatDuration = (60.0 / pattern.bpm) * (4.0 / pattern.timeSignature[1]);
    return beatDuration / SUBDIVISIONS_PER_BEAT;
  }, []);

  // 计算指定 pattern 的每小节 subdivisions 数量
  const getSubdivisionsPerBar = useCallback((pattern: Pattern): number => {
    const [beatsPerBar] = pattern.timeSignature;
    return beatsPerBar * SUBDIVISIONS_PER_BEAT;
  }, []);

  // seekTo 函数：跳转到指定的 subdivision 位置
  const seekTo = useCallback((subdivision: number) => {
    const steps = playStepsRef.current;
    if (steps.length === 0) return;

    // 找到包含该 subdivision 的 step
    let targetStepIndex = -1;
    let targetSubInStep = subdivision;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepSubsPerBar = getSubdivisionsPerBar(step.pattern);
      const stepStartSub = step.startBar * stepSubsPerBar;
      const stepEndSub = (step.endBar + 1) * stepSubsPerBar;

      // 检查 subdivision 是否在当前 step 的范围内
      if (subdivision >= stepStartSub && subdivision < stepEndSub) {
        targetStepIndex = i;
        targetSubInStep = subdivision;
        break;
      }
    }

    // 如果找不到对应的 step，跳到第一个 step 的开始
    if (targetStepIndex === -1) {
      targetStepIndex = 0;
      const firstStep = steps[0];
      const firstStepSubsPerBar = getSubdivisionsPerBar(firstStep.pattern);
      targetSubInStep = firstStep.startBar * firstStepSubsPerBar;
    }

    // 更新播放位置
    currentStepIndexRef.current = targetStepIndex;
    currentSubdivisionInStepRef.current = targetSubInStep;

    // 如果正在播放，更新 nextNoteTimeRef
    if (isRunningRef.current) {
      const ctx = getAudioContext();
      nextNoteTimeRef.current = ctx.currentTime;
    }

    // 更新动画状态
    const callback = onSubdivisionChangeRef.current;
    if (callback) {
      scheduleAnimationUpdate(targetSubInStep, callback, 0);
    }

    // 通知 pattern 变化
    const patternCallback = onPatternChangeRef.current;
    if (patternCallback) {
      const targetStep = steps[targetStepIndex];
      patternCallback(targetStep.patternName);
    }
  }, [getSubdivisionsPerBar]);

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
        // 如果当前编辑的 pattern ID 匹配（无论名称是否相同），使用当前编辑的版本
        // 这确保页面刷新后加载的 pattern 数据是最新的
        if (p.id === currentPattern.id) {
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

  // 更新播放序列
  useEffect(() => {
    playStepsRef.current = buildPlaySteps();
  }, [buildPlaySteps]);

  // 播放单个 subdivision
  const playSubdivision = useCallback(
    (pattern: Pattern, subdivisionIndex: number, time: number) => {
      const subDuration = getSubdivisionDuration(pattern);
      const halfSubdivision = subDuration / 2;

      const triggerDrum = (
        drum: typeof pattern.drums[number],
        playTime: number,
        volume: number
      ) => {
        setVolumeMultiplier(volume);
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
      };

      pattern.grid.forEach((row, drumIndex) => {
        const cellState: CellState = row[subdivisionIndex];
        if (cellState === CELL_OFF) return;

        const drum = pattern.drums[drumIndex];
        const playTime = time;

        if (cellState === CELL_GRACE) {
          const graceNoteTime = playTime - subDuration * 0.125;
          triggerDrum(drum, graceNoteTime, 0.2);
          triggerDrum(drum, playTime, 1);
          return;
        }

        if (
          cellState === CELL_DOUBLE_32 ||
          cellState === CELL_FIRST_32 ||
          cellState === CELL_SECOND_32
        ) {
          if (cellState === CELL_DOUBLE_32 || cellState === CELL_FIRST_32) {
            triggerDrum(drum, playTime, 1);
          }
          if (cellState === CELL_DOUBLE_32 || cellState === CELL_SECOND_32) {
            triggerDrum(drum, playTime + halfSubdivision, 1);
          }
          return;
        }

        const volumeMultiplier = cellState === CELL_GHOST ? 0.3 : 1;
        triggerDrum(drum, playTime, volumeMultiplier);
      });
    },
    [getSubdivisionDuration]
  );

  // 调度器函数
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    if (!isRunningRef.current) return;

    const currentTime = ctx.currentTime;
    const steps = playStepsRef.current;

    if (steps.length === 0) return;

    while (
      nextNoteTimeRef.current <
      currentTime + scheduleAheadTimeRef.current
    ) {
      let stepIndex = currentStepIndexRef.current;
      let subInStep = currentSubdivisionInStepRef.current;

      // 检查当前步骤索引是否有效
      if (stepIndex < 0 || stepIndex >= steps.length) {
        // 索引无效，重置到开始
        stepIndex = 0;
        const firstStep = steps[0];
        const firstStepSubsPerBar = getSubdivisionsPerBar(firstStep.pattern);
        subInStep = firstStep.startBar * firstStepSubsPerBar;
        currentStepIndexRef.current = 0;
        currentSubdivisionInStepRef.current = subInStep;

        // 通知 pattern 变化
        const callback = onPatternChangeRef.current;
        if (callback) {
          callback(firstStep.patternName);
        }

        if (nextNoteTimeRef.current < currentTime) {
          nextNoteTimeRef.current = currentTime;
        }
        continue;
      }

      const step = steps[stepIndex];
      const stepSubsPerBar = getSubdivisionsPerBar(step.pattern);
      const stepStartSub = step.startBar * stepSubsPerBar;
      const stepEndSub = (step.endBar + 1) * stepSubsPerBar;

      // 检查是否超出当前步骤范围
      if (subInStep >= stepEndSub) {
        // 移动到下一个步骤
        currentStepIndexRef.current = stepIndex + 1;
        if (stepIndex + 1 < steps.length) {
          const nextStep = steps[stepIndex + 1];
          const nextStepSubsPerBar = getSubdivisionsPerBar(nextStep.pattern);
          currentSubdivisionInStepRef.current = nextStep.startBar * nextStepSubsPerBar;

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

      // 使用当前步骤 pattern 的 BPM 计算下一个音符的时间
      const subDuration = getSubdivisionDuration(step.pattern);
      nextNoteTimeRef.current += subDuration;
    }
  }, [playSubdivision, getSubdivisionDuration, getSubdivisionsPerBar]);

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

    // 检查当前位置是否在有效范围内，且指向的是当前选中的 pattern
    let needsReset = true;
    const currentStepIndex = currentStepIndexRef.current;
    const currentSubInStep = currentSubdivisionInStepRef.current;

    if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
      const currentStep = steps[currentStepIndex];
      const currentStepSubsPerBar = getSubdivisionsPerBar(currentStep.pattern);
      const stepStartSub = currentStep.startBar * currentStepSubsPerBar;
      const stepEndSub = (currentStep.endBar + 1) * currentStepSubsPerBar;

      // 检查当前位置是否有效，且该位置的 pattern 是否是当前选中的 pattern
      const isPositionValid = currentSubInStep >= stepStartSub && currentSubInStep < stepEndSub;
      const isCorrectPattern = currentStep.pattern.id === currentPatternRef.current.id;

      // 只有当位置有效且 pattern 匹配时，才不需要重置
      if (isPositionValid && isCorrectPattern) {
        needsReset = false;
      }
    }

    // 如果需要重置，从当前选中的 pattern 开始（如果在 range 内），否则从 range 开始
    if (needsReset) {
      // 找到当前选中的 pattern 在播放序列中的位置
      // 优先使用 ID 匹配，因为这更可靠（特别是在页面刷新后）
      const currentPatternId = currentPatternRef.current.id;
      let startStepIndex = steps.findIndex((step) => step.pattern.id === currentPatternId);

      // 如果 ID 匹配失败，尝试使用名称匹配
      if (startStepIndex === -1) {
        const currentPatternName = isDraftModeRef.current ? "" : currentPatternRef.current.name;
        startStepIndex = steps.findIndex((step) => step.patternName === currentPatternName);
      }

      // 如果当前 pattern 不在播放序列中，从第一个 step 开始
      if (startStepIndex === -1) {
        startStepIndex = 0;
      }

      const startStep = steps[startStepIndex];
      const startStepSubsPerBar = getSubdivisionsPerBar(startStep.pattern);
      const startSub = startStep.startBar * startStepSubsPerBar;

      currentStepIndexRef.current = startStepIndex;
      currentSubdivisionInStepRef.current = startSub;

      // 通知初始 pattern
      const callback = onPatternChangeRef.current;
      if (callback) {
        callback(startStep.patternName);
      }

      const subCallback = onSubdivisionChangeRef.current;
      if (subCallback) {
        scheduleAnimationUpdate(startSub, subCallback, 0);
      }
    } else {
      // 从暂停位置继续，更新动画状态到当前位置
      const subCallback = onSubdivisionChangeRef.current;
      if (subCallback) {
        scheduleAnimationUpdate(currentSubInStep, subCallback, 0);
      }
    }

    nextNoteTimeRef.current = currentTime;
    scheduler();

    schedulerIntervalRef.current = window.setInterval(
      scheduler,
      lookaheadRef.current
    );
  }, [scheduler, getSubdivisionsPerBar]);

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

  return { seekTo };
}

