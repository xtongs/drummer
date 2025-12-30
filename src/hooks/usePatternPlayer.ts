import { useEffect, useRef, useCallback } from "react";
import type { Pattern, CellState } from "../types";
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

// WakeLock 管理：防止播放时手机锁屏
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

// 使用 setTimeout + requestAnimationFrame 来同步动画更新
// 确保动画与音频播放时间对齐
function scheduleAnimationUpdate(
  subdivision: number,
  callback: (subdivision: number) => void,
  delayMs: number
) {
  // 使用 setTimeout 延迟到声音播放时间，然后使用 requestAnimationFrame 确保在渲染帧更新
  const timeoutDelay = Math.max(0, delayMs);
  setTimeout(() => {
    requestAnimationFrame(() => {
      callback(subdivision);
    });
  }, timeoutDelay);
}

interface UsePatternPlayerOptions {
  pattern: Pattern;
  isPlaying: boolean;
  onSubdivisionChange?: (subdivision: number) => void;
}

export function usePatternPlayer({
  pattern,
  isPlaying,
  onSubdivisionChange,
}: UsePatternPlayerOptions) {
  const nextNoteTimeRef = useRef<number>(0);
  const scheduleAheadTimeRef = useRef<number>(0.1);
  const lookaheadRef = useRef<number>(25);
  const schedulerIntervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const currentSubdivisionRef = useRef<number>(0);

  // 使用 ref 存储所有动态数据，避免重新创建回调函数导致播放重启
  const startSubdivisionRef = useRef<number>(0);
  const endSubdivisionRef = useRef<number>(0);
  const subdivisionDurationRef = useRef<number>(0);
  const subdivisionsPerBarRef = useRef<number>(0);
  const patternRef = useRef<Pattern>(pattern);
  const onSubdivisionChangeRef = useRef(onSubdivisionChange);

  // 计算时间参数
  const [beatsPerBar] = pattern.timeSignature;
  const beatDuration = (60.0 / pattern.bpm) * (4.0 / pattern.timeSignature[1]);
  const subdivisionDuration = beatDuration / SUBDIVISIONS_PER_BEAT;
  const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

  // 计算循环范围
  const loopRange = pattern.loopRange || [0, pattern.bars - 1];
  const startBar = loopRange[0];
  const endBar = loopRange[1];
  const startSubdivision = startBar * subdivisionsPerBar;
  const endSubdivision = (endBar + 1) * subdivisionsPerBar;

  // 更新 ref 值（同步更新，不触发回调重新创建）
  startSubdivisionRef.current = startSubdivision;
  endSubdivisionRef.current = endSubdivision;
  subdivisionDurationRef.current = subdivisionDuration;
  subdivisionsPerBarRef.current = subdivisionsPerBar;
  patternRef.current = pattern;
  onSubdivisionChangeRef.current = onSubdivisionChange;

  // 播放单个subdivision的鼓件 - 使用 ref 避免依赖 pattern
  const playSubdivision = useCallback(
    (subdivisionIndex: number, time: number) => {
      const currentPattern = patternRef.current;
      currentPattern.grid.forEach((row, drumIndex) => {
        const cellState: CellState = row[subdivisionIndex];
        if (cellState !== CELL_OFF) {
          const drum = currentPattern.drums[drumIndex];
          const playTime = time;

          // 设置音量乘数：鬼音为 0.3，正常为 1
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

          // 重置音量乘数
          resetVolumeMultiplier();
        }
      });
    },
    [] // 无依赖，通过 ref 访问最新 pattern
  );

  // 调度器函数 - 使用 ref 避免依赖变化导致重新创建
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    if (!isRunningRef.current) return;

    const currentTime = ctx.currentTime;
    const startSub = startSubdivisionRef.current;
    const endSub = endSubdivisionRef.current;
    const subDuration = subdivisionDurationRef.current;

    while (
      nextNoteTimeRef.current <
      currentTime + scheduleAheadTimeRef.current
    ) {
      let subdivisionIndex = currentSubdivisionRef.current;

      // 检查是否在循环范围内
      if (subdivisionIndex < startSub) {
        subdivisionIndex = startSub;
        currentSubdivisionRef.current = startSub;
      } else if (subdivisionIndex >= endSub) {
        // 循环回到开始
        subdivisionIndex = startSub;
        currentSubdivisionRef.current = startSub;
        // 确保循环后的时间不会太早
        if (nextNoteTimeRef.current < currentTime) {
          nextNoteTimeRef.current = currentTime;
        }
        continue;
      }

      // 确保播放时间不早于当前时间
      const playTime = Math.max(nextNoteTimeRef.current, currentTime);

      // 计算动画延迟时间（毫秒），使动画与声音同步
      const delayMs = (playTime - currentTime) * 1000;

      // 播放当前subdivision
      playSubdivision(subdivisionIndex, playTime);

      // 使用 setTimeout + requestAnimationFrame 同步更新动画状态
      const callback = onSubdivisionChangeRef.current;
      if (callback) {
        scheduleAnimationUpdate(subdivisionIndex, callback, delayMs);
      }
      currentSubdivisionRef.current = subdivisionIndex + 1;

      // 移动到下一个subdivision
      nextNoteTimeRef.current += subDuration;
    }
  }, [playSubdivision]); // 只依赖 playSubdivision，它没有依赖所以稳定

  // 开始播放 - 使用 ref 避免依赖变化导致重新创建
  const start = useCallback(async () => {
    const ctx = getAudioContext();
    if (isRunningRef.current) return;

    // 恢复 AudioContext（如果被暂停）- 等待完成
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // 等待一帧，确保 AudioContext 完全准备好
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 请求 WakeLock 防止手机锁屏
    requestWakeLock();

    isRunningRef.current = true;
    const currentTime = ctx.currentTime;
    const startSub = startSubdivisionRef.current;
    const endSub = endSubdivisionRef.current;

    // 如果当前位置不在循环范围内，则重置到开始位置
    // 否则保持当前位置（从暂停恢复）
    if (
      currentSubdivisionRef.current < startSub ||
      currentSubdivisionRef.current >= endSub
    ) {
      currentSubdivisionRef.current = startSub;
      const callback = onSubdivisionChangeRef.current;
      if (callback) {
        scheduleAnimationUpdate(startSub, callback, 0);
      }
    }

    // 设置初始时间，立即开始调度
    nextNoteTimeRef.current = currentTime;

    // 立即运行一次调度器，确保第一个声音立即播放
    scheduler();

    // 启动调度器
    schedulerIntervalRef.current = window.setInterval(
      scheduler,
      lookaheadRef.current
    );
  }, [scheduler]); // scheduler 是稳定的，所以 start 也是稳定的

  // 停止播放（暂停时不重置位置）
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerIntervalRef.current !== null) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    // 释放 WakeLock
    releaseWakeLock();
    // 不重置位置，保持当前位置以便恢复播放
  }, []);

  // 根据isPlaying状态控制播放
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

  // 当 bpm 或 bars 改变时重置播放器
  // 注意：loopRange 变化不需要重启，因为它通过 ref 动态更新
  useEffect(() => {
    if (isPlaying) {
      stop();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern.bpm, pattern.bars]);
}
