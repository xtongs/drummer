import { useState, useEffect, useRef, useCallback } from "react";
import { playAccent, playBeat, getAudioContext } from "../utils/audioEngine";
import { SUBDIVISIONS_PER_BEAT } from "../utils/constants";

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

let lastAnimationUpdateTime = 0;
const ANIMATION_THROTTLE = 16;

interface UseMetronomeOptions {
  bpm: number;
  timeSignature: [number, number]; // [beatsPerBar, noteValue]
  isPlaying: boolean;
  onBeatChange?: (beat: number) => void;
  resetToken?: number;
}

export function useMetronome({
  bpm,
  timeSignature,
  isPlaying,
  onBeatChange,
  resetToken,
}: UseMetronomeOptions) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // 使用 ref 存储所有动态值，避免闭包问题
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);
  const onBeatChangeRef = useRef(onBeatChange);

  // 更新 ref 值
  bpmRef.current = bpm;
  timeSignatureRef.current = timeSignature;
  onBeatChangeRef.current = onBeatChange;

  const nextNoteTimeRef = useRef<number>(0);
  const currentSubdivisionRef = useRef<number>(0);
  const schedulerIntervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const activeTimeoutsRef = useRef<Set<number>>(new Set());

  // 调度器函数 - 使用 ref 获取最新值
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    if (!isRunningRef.current) return;

    // 从 ref 获取最新值
    const currentBpm = bpmRef.current;
    const currentTimeSignature = timeSignatureRef.current;
    const beatsPerBar = currentTimeSignature[0];
    const noteValue = currentTimeSignature[1];

    // 计算当前的时间间隔
    const beatDuration = (60.0 / currentBpm) * (4.0 / noteValue);
    const subdivisionDuration = beatDuration / SUBDIVISIONS_PER_BEAT;
    const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

    const currentTime = ctx.currentTime;
    const scheduleAheadTime = 0.1; // 提前调度时间（秒）

    // 如果到了播放时间，调度节拍
    while (nextNoteTimeRef.current < currentTime + scheduleAheadTime) {
      const subdivisionIndex = currentSubdivisionRef.current;
      const beatNumber = Math.floor(subdivisionIndex / SUBDIVISIONS_PER_BEAT);

      // 确保播放时间不早于当前时间
      const playTime = Math.max(nextNoteTimeRef.current, currentTime);

      // 计算动画延迟时间（毫秒）
      const delayMs = (playTime - currentTime) * 1000;

      // 只在每拍的第一个 subdivision 播放节拍器声音
      if (subdivisionIndex % SUBDIVISIONS_PER_BEAT === 0) {
        if (beatNumber === 0) {
          playAccent(playTime);
        } else {
          playBeat(playTime);
        }
        // 通知外部 beat 变化
        const callback = onBeatChangeRef.current;
        if (callback) {
          const timeoutId = window.setTimeout(
            () => callback(beatNumber),
            delayMs,
          ) as unknown as number;
          activeTimeoutsRef.current.add(timeoutId);
        }
      }

      // 使用 setTimeout + requestAnimationFrame 同步更新动画状态
      const subIdx = subdivisionIndex;
      const beatNum = beatNumber;
      const timeoutId = window.setTimeout(() => {
        // 从 set 中移除已执行的 timeout
        activeTimeoutsRef.current.delete(timeoutId as unknown as number);

        const now = Date.now();
        if (now - lastAnimationUpdateTime >= ANIMATION_THROTTLE) {
          requestAnimationFrame(() => {
            lastAnimationUpdateTime = Date.now();
            // 检查是否仍在运行，避免停止后的更新
            if (isRunningRef.current) {
              setCurrentSubdivision(subIdx);
              setCurrentBeat(beatNum);
            }
          });
        } else {
          // 检查是否仍在运行，避免停止后的更新
          if (isRunningRef.current) {
            setCurrentSubdivision(subIdx);
            setCurrentBeat(beatNum);
          }
        }
      }, Math.max(0, delayMs));
      activeTimeoutsRef.current.add(timeoutId as unknown as number);

      // 移动到下一个 subdivision
      currentSubdivisionRef.current =
        (currentSubdivisionRef.current + 1) % subdivisionsPerBar;
      nextNoteTimeRef.current += subdivisionDuration;
    }
  }, []);

  // 开始节拍器
  const start = useCallback(async () => {
    const ctx = getAudioContext();
    if (isRunningRef.current) return;

    // 恢复 AudioContext
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // 等待一帧
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 请求 WakeLock
    requestWakeLock();

    isRunningRef.current = true;
    const currentTime = ctx.currentTime;

    // 保持当前位置继续播放（不重置）
    // 设置下一个播放时间为当前时间
    nextNoteTimeRef.current = currentTime;

    // 立即运行一次调度器
    scheduler();

    // 启动调度器（25ms 间隔检查）
    schedulerIntervalRef.current = window.setInterval(scheduler, 25);
  }, [scheduler]);

  // 停止节拍器
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerIntervalRef.current !== null) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    // 清除所有待执行的 setTimeout 回调
    activeTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    activeTimeoutsRef.current.clear();
    releaseWakeLock();
  }, []);

  // 根据 isPlaying 状态控制节拍器
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

  // 当 BPM 或拍号改变时，重置节拍器
  useEffect(() => {
    if (isPlaying && isRunningRef.current) {
      // 不需要重启，因为 scheduler 会从 ref 读取最新的 BPM
      // 但需要重置时间以确保节奏正确
      const ctx = getAudioContext();
      nextNoteTimeRef.current = ctx.currentTime;
    }
  }, [bpm, timeSignature, isPlaying]);

  useEffect(() => {
    currentSubdivisionRef.current = 0;
    setCurrentSubdivision(0);
    setCurrentBeat(0);
    // 清除所有待执行的 setTimeout 回调
    activeTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    activeTimeoutsRef.current.clear();
    if (isPlaying && isRunningRef.current) {
      const ctx = getAudioContext();
      nextNoteTimeRef.current = ctx.currentTime;
    }
  }, [resetToken, isPlaying]);

  return {
    currentBeat,
    currentSubdivision,
  };
}
