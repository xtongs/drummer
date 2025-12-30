import { useEffect, useRef, useCallback } from "react";
import type { Pattern } from "../types";
import { SUBDIVISIONS_PER_BEAT } from "../utils/constants";
import {
  playKick,
  playSnare,
  playHiHat,
  playCymbal,
  playTom,
} from "../utils/audioEngine";

// 使用 requestAnimationFrame 来同步动画更新
let animationFrameId: number | null = null;
const pendingUpdates: Array<{ subdivision: number; callback: (subdivision: number) => void }> = [];

function scheduleAnimationUpdate(subdivision: number, callback: (subdivision: number) => void) {
  pendingUpdates.push({ subdivision, callback });
  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null;
      const updates = pendingUpdates.splice(0);
      updates.forEach(({ subdivision, callback }) => {
        callback(subdivision);
      });
    });
  }
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const scheduleAheadTimeRef = useRef<number>(0.1);
  const lookaheadRef = useRef<number>(25);
  const schedulerIntervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const currentSubdivisionRef = useRef<number>(0);

  // 初始化 AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }, []);

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

  // 播放单个subdivision的鼓件
  const playSubdivision = useCallback(
    (subdivisionIndex: number, time: number) => {
      pattern.grid.forEach((row, drumIndex) => {
        if (row[subdivisionIndex]) {
          const drum = pattern.drums[drumIndex];
          const playTime = time;

          switch (drum) {
            case "Kick":
              playKick(playTime);
              break;
            case "Snare":
              playSnare(playTime);
              break;
            case "Hi-Hat Closed":
            case "Hi-Hat Open":
              playHiHat(playTime);
              break;
            case "Crash 1":
              playCymbal(playTime, 1200);
              break;
            case "Crash 2":
              playCymbal(playTime, 1000);
              break;
            case "Ride":
              playCymbal(playTime, 800);
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
        }
      });
    },
    [pattern]
  );

  // 调度器函数
  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || !isRunningRef.current) return;

    const currentTime = ctx.currentTime;

    while (nextNoteTimeRef.current < currentTime + scheduleAheadTimeRef.current) {
      let subdivisionIndex = currentSubdivisionRef.current;

      // 检查是否在循环范围内
      if (subdivisionIndex < startSubdivision) {
        subdivisionIndex = startSubdivision;
        currentSubdivisionRef.current = startSubdivision;
      } else if (subdivisionIndex >= endSubdivision) {
        // 循环回到开始
        subdivisionIndex = startSubdivision;
        currentSubdivisionRef.current = startSubdivision;
        // 确保循环后的时间不会太早
        if (nextNoteTimeRef.current < currentTime) {
          nextNoteTimeRef.current = currentTime;
        }
        continue;
      }

      // 确保播放时间不早于当前时间
      const playTime = Math.max(nextNoteTimeRef.current, currentTime);
      
      // 播放当前subdivision
      playSubdivision(subdivisionIndex, playTime);

      // 使用 requestAnimationFrame 同步更新动画状态
      if (onSubdivisionChange) {
        scheduleAnimationUpdate(subdivisionIndex, onSubdivisionChange);
      }
      currentSubdivisionRef.current = subdivisionIndex + 1;

      // 移动到下一个subdivision
      nextNoteTimeRef.current += subdivisionDuration;
    }
  }, [
    subdivisionDuration,
    startSubdivision,
    endSubdivision,
    playSubdivision,
    onSubdivisionChange,
  ]);

  // 开始播放
  const start = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx || isRunningRef.current) return;

    // 恢复 AudioContext（如果被暂停）- 等待完成
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // 等待一帧，确保 AudioContext 完全准备好
    await new Promise(resolve => requestAnimationFrame(resolve));

    isRunningRef.current = true;
    const currentTime = ctx.currentTime;
    
    // 如果当前位置不在循环范围内，则重置到开始位置
    // 否则保持当前位置（从暂停恢复）
    if (currentSubdivisionRef.current < startSubdivision || 
        currentSubdivisionRef.current >= endSubdivision) {
      currentSubdivisionRef.current = startSubdivision;
      if (onSubdivisionChange) {
        scheduleAnimationUpdate(startSubdivision, onSubdivisionChange);
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
  }, [scheduler, startSubdivision, endSubdivision, onSubdivisionChange]);

  // 停止播放（暂停时不重置位置）
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerIntervalRef.current !== null) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    // 清理待处理的动画更新
    pendingUpdates.length = 0;
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

  // 当pattern改变时重置
  useEffect(() => {
    if (isPlaying) {
      stop();
      start();
    }
  }, [pattern.bpm, pattern.bars, pattern.loopRange, isPlaying, start, stop]);
}

