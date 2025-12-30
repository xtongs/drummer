import { useState, useEffect, useRef, useCallback } from "react";
import { playAccent, playBeat, getAudioContext } from "../utils/audioEngine";
import { SUBDIVISIONS_PER_BEAT } from "../utils/constants";

// WakeLock 管理：防止播放时手机锁屏
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      console.log("Metronome WakeLock acquired");

      // 监听 WakeLock 释放事件
      wakeLock.addEventListener("release", () => {
        console.log("Metronome WakeLock released");
      });
    } catch (err) {
      console.log("Metronome WakeLock request failed:", err);
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log("Metronome WakeLock released manually");
    } catch (err) {
      console.log("Metronome WakeLock release failed:", err);
    }
  }
}

// 使用 setTimeout + requestAnimationFrame 来同步动画更新
// 确保动画与音频播放时间对齐
function scheduleMetronomeAnimationUpdate(
  subdivision: number,
  beat: number,
  setSubdivision: (sub: number) => void,
  setBeat: (beat: number) => void,
  delayMs: number
) {
  // 使用 setTimeout 延迟到声音播放时间，然后使用 requestAnimationFrame 确保在渲染帧更新
  const timeoutDelay = Math.max(0, delayMs);
  setTimeout(() => {
    requestAnimationFrame(() => {
      setSubdivision(subdivision);
      setBeat(beat);
    });
  }, timeoutDelay);
}

interface UseMetronomeOptions {
  bpm: number;
  timeSignature: [number, number]; // [beatsPerBar, noteValue]
  isPlaying: boolean;
  onBeatChange?: (beat: number) => void;
}

export function useMetronome({
  bpm,
  timeSignature,
  isPlaying,
  onBeatChange,
}: UseMetronomeOptions) {
  const [currentBeat, setCurrentBeat] = useState(0); // beat number (0-3 for 4/4)
  const [currentSubdivision, setCurrentSubdivision] = useState(0); // subdivision index (0-15 for 4 beats * 4)
  const nextNoteTimeRef = useRef<number>(0);
  const scheduleAheadTimeRef = useRef<number>(0.1); // 提前调度时间（秒）
  const lookaheadRef = useRef<number>(25); // 检查间隔（毫秒）
  const schedulerIntervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);

  // 计算每拍时长（秒）
  const beatDuration = (60.0 / bpm) * (4.0 / timeSignature[1]);
  const subdivisionDuration = beatDuration / SUBDIVISIONS_PER_BEAT;
  const beatsPerBar = timeSignature[0];
  const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

  // 调度下一个节拍
  const scheduleNote = useCallback(
    (beatNumber: number, time: number) => {
      // 播放声音
      if (beatNumber === 0) {
        // 第一拍（重拍）
        playAccent(time);
      } else {
        // 其他拍
        playBeat(time);
      }

      // 通知外部 beat 变化（用于节拍器显示）
      onBeatChange?.(beatNumber);
      // 注意：状态更新由调度器统一管理，避免重复更新
    },
    [onBeatChange]
  );

  // 跟踪当前subdivision
  const currentSubdivisionRef = useRef<number>(0);

  // 调度器函数（16分音符精度）
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    if (!isRunningRef.current) return;

    const currentTime = ctx.currentTime;

    // 如果到了播放时间，调度节拍
    while (nextNoteTimeRef.current < currentTime + scheduleAheadTimeRef.current) {
      const subdivisionIndex = currentSubdivisionRef.current;
      const beatNumber = Math.floor(subdivisionIndex / SUBDIVISIONS_PER_BEAT);

      // 确保播放时间不早于当前时间
      const playTime = Math.max(nextNoteTimeRef.current, currentTime);
      
      // 计算动画延迟时间（毫秒），使动画与声音同步
      const delayMs = (playTime - currentTime) * 1000;

      // 只在每拍的第一 subdivision 播放节拍器声音
      if (subdivisionIndex % SUBDIVISIONS_PER_BEAT === 0) {
        scheduleNote(beatNumber, playTime);
      }

      // 使用 setTimeout + requestAnimationFrame 同步更新动画状态
      scheduleMetronomeAnimationUpdate(
        subdivisionIndex,
        beatNumber,
        setCurrentSubdivision,
        setCurrentBeat,
        delayMs
      );

      // 移动到下一个subdivision
      currentSubdivisionRef.current = (currentSubdivisionRef.current + 1) % subdivisionsPerBar;
      nextNoteTimeRef.current += subdivisionDuration;
    }
  }, [subdivisionDuration, subdivisionsPerBar, beatsPerBar, scheduleNote]);

  // 开始节拍器
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
    
    // 如果当前位置超出范围，则重置到开始位置
    // 否则保持当前位置（从暂停恢复）
    if (currentSubdivisionRef.current >= subdivisionsPerBar) {
      currentSubdivisionRef.current = 0;
      scheduleMetronomeAnimationUpdate(0, 0, setCurrentSubdivision, setCurrentBeat, 0);
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
  }, [scheduler, subdivisionsPerBar]);

  // 停止节拍器（暂停时不重置位置）
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
    if (isPlaying) {
      stop();
      start();
    }
  }, [bpm, timeSignature, isPlaying, start, stop]);

  return {
    currentBeat, // beat number (0-3) for visualization
    currentSubdivision, // subdivision index (0-15) for grid/notation highlighting
  };
}

