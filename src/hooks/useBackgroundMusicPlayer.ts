import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { getAudioContext } from "../utils/audioEngine";
import type { BgmConfig } from "../utils/bgmStorage";
import { getBgmFile } from "../utils/bgmStorage";
import { SUBDIVISIONS_PER_BEAT } from "../utils/constants";
import type { Pattern } from "../types";

interface UseBackgroundMusicPlayerOptions {
  isPlaying: boolean;
  isFullPracticeMode: boolean;
  playbackRate: number;
  bgmConfig: BgmConfig;
  currentSubdivision: number;
  pattern: Pattern;
  patternStartToken: number;
  rangeStartBar: number; // 当前播放范围起始小节（从 bar 0 开始）
}

interface BackgroundMusicState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

export function useBackgroundMusicPlayer({
  isPlaying,
  isFullPracticeMode,
  playbackRate,
  bgmConfig,
  currentSubdivision,
  pattern,
  patternStartToken,
  rangeStartBar,
}: UseBackgroundMusicPlayerOptions): BackgroundMusicState {
  const beatsPerBar = pattern.timeSignature[0];
  const beatUnit = pattern.timeSignature[1];
  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const fileIdRef = useRef<string | undefined>(undefined);
  const [state, setState] = useState<BackgroundMusicState>({
    isLoading: false,
    isLoaded: false,
    error: null,
  });
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const positionSecondsRef = useRef(0);
  const lastSubdivisionRef = useRef<number | null>(null);
  const lastStartTimeRef = useRef<number>(0);

  const startFromCurrentPosition = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const ctx = getAudioContext();
    const baseTime = ctx.currentTime;
    const offsetSeconds = (bgmConfig.offsetMs ?? 0) / 1000;
    const effectiveRate = Math.max(0.1, playbackRateRef.current);

    // Pattern 当前播放时间（实际时间）
    const patternTime = positionSecondsRef.current;

    // ⚠️ 关键逻辑：BGM offset 是相对于"原始节奏"的，不受 playbackRate 影响！
    //
    // 为什么必须使用原始节奏时间（不考虑 playbackRate）？
    //
    // 场景：用户在 rate=1.0 时设置了 offset = -0.87秒（BGM 比节奏提前 0.87秒）
    //
    // 错误做法（使用考虑 rate 的时间）：
    //   - rate=1.0: t0=3.33, bgmPos=4.20, diff=0.87 ✓
    //   - rate=0.9: t0=3.70, bgmPos=5.08, diff=1.75 ✗ (BGM 偏离！)
    //
    // 正确做法（使用原始节奏时间）：
    //   - rate=1.0: t0=3.33, bgmPos=4.20, diff=0.87 ✓
    //   - rate=0.9: t0=3.33, bgmPos=4.67, diff=1.34 → 但 player.playbackRate=0.9，
    //              所以实际听感是 4.67 * 0.9 = 4.20，与节奏同步！✓
    //
    // 关键点：
    // 1. offset 是用户设置的，相对于原始节奏的固定偏移
    // 2. 计算 BGM 位置时，必须使用原始节奏时间（不考虑 playbackRate）
    // 3. BGM player 的 playbackRate 会自动处理播放速度的变化
    // 4. 这样无论 rate 如何变化，BGM 都能保持与节奏的正确同步

    // 计算 range start 的原始节奏时间（从 bar 0 到 rangeStartBar）
    // ⚠️ 必须使用原始 BPM，不乘以 playbackRate
    let timeAtRangeStartOriginal = 0;
    for (let barIndex = 0; barIndex < rangeStartBar; barIndex++) {
      const barBpm = pattern.barBpmOverrides?.[barIndex] ?? pattern.bpm;
      const originalBeatDuration = (60 / barBpm) * (4 / beatUnit);
      const originalBarDuration = originalBeatDuration * beatsPerBar;
      timeAtRangeStartOriginal += originalBarDuration;
    }

    // 将 patternTime（已考虑 playbackRate）转换回原始节奏时间
    // patternTime / playbackRate = 原始节奏时间
    const patternTimeOriginal = patternTime / playbackRateRef.current;

    // 使用原始节奏时间计算 BGM 位置
    const absolutePatternTime = patternTimeOriginal + timeAtRangeStartOriginal;
    const adjustedPatternTime = absolutePatternTime - offsetSeconds;

    // 转换为 BGM 原始速率下的位置
    // 因为 Tone.js 的 startOffset 是相对于音频文件的，不受 playbackRate 影响
    const desiredBgmPosition = adjustedPatternTime / effectiveRate;

    const startDelay =
      adjustedPatternTime < 0 ? Math.abs(adjustedPatternTime) : 0;
    const startTime = baseTime + startDelay;
    const startOffset = Math.max(0, desiredBgmPosition);
    let safeStartOffset = startOffset;
    if (player.buffer?.duration !== undefined) {
      const maxOffset = Math.max(0, player.buffer.duration - 0.001);
      safeStartOffset = Math.min(maxOffset, startOffset);
    }

    if (player.state === "started") {
      player.stop();
    }

    // 确保 startTime 严格递增（Tone.js 要求）
    const adjustedStartTime = Math.max(
      startTime,
      lastStartTimeRef.current + 0.001,
    );
    lastStartTimeRef.current = adjustedStartTime;

    player.start(adjustedStartTime, safeStartOffset);
  }, [
    bgmConfig.offsetMs,
    pattern.barBpmOverrides,
    pattern.bpm,
    beatUnit,
    beatsPerBar,
    rangeStartBar,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const loadPlayer = async () => {
      if (!bgmConfig.fileId) {
        fileIdRef.current = undefined;
        if (playerRef.current) {
          playerRef.current.stop();
          playerRef.current.dispose();
          playerRef.current = null;
        }
        setState({ isLoading: false, isLoaded: false, error: null });
        return;
      }

      if (bgmConfig.fileId === fileIdRef.current && playerRef.current) {
        return;
      }

      setState({ isLoading: true, isLoaded: false, error: null });
      try {
        const record = await getBgmFile(bgmConfig.fileId);
        if (!record) {
          throw new Error("Background music file not found");
        }

        const ctx = getAudioContext();
        const arrayBuffer = await record.blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

        if (isCancelled) return;

        if (playerRef.current) {
          playerRef.current.stop();
          playerRef.current.dispose();
        }

        const player = new Tone.GrainPlayer(audioBuffer).toDestination();
        player.loop = false;
        player.playbackRate = Math.max(0.1, playbackRateRef.current);

        // 优化 GrainPlayer 参数以减少音量波动
        // 使用较大的 grainSize 和较小的 overlap 可以提供更稳定的播放效果
        player.grainSize = 0.2; // 200ms 颗粒尺寸
        player.overlap = 0.02; // 20ms 交叉淡入淡出时间（最小化波动）

        // 初始化时立即设置音量
        const volume = Math.max(0, Math.min(100, bgmConfig.volumePct ?? 100));
        const normalized = Math.max(0.0001, volume / 100);
        player.volume.value = Tone.gainToDb(normalized);
        playerRef.current = player;
        fileIdRef.current = bgmConfig.fileId;
        setState({ isLoading: false, isLoaded: true, error: null });
      } catch (error) {
        if (!isCancelled) {
          setState({
            isLoading: false,
            isLoaded: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load background music",
          });
        }
      }
    };

    void loadPlayer();

    return () => {
      isCancelled = true;
    };
  }, [bgmConfig.fileId, bgmConfig.volumePct]);

  useEffect(() => {
    // 计算实际播放时间（考虑 playbackRate 和每小节 BPM 覆盖）
    const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

    // 累计计算从 bar 0 到 currentSubdivision 的总时间
    // 每个小节使用自己的 BPM（基础 BPM 或特殊 BPM）
    const currentBarIndex = Math.floor(currentSubdivision / subdivisionsPerBar);
    let totalSeconds = 0;

    for (let barIndex = 0; barIndex < currentBarIndex; barIndex++) {
      // 获取该小节的 BPM
      const barBpm = pattern.barBpmOverrides?.[barIndex] ?? pattern.bpm;
      const effectiveBpm = barBpm * playbackRate;
      const beatDuration = (60 / effectiveBpm) * (4 / beatUnit);
      const barDuration = beatDuration * beatsPerBar;
      totalSeconds += barDuration;
    }

    // 加上当前小节内的时间
    const currentBarBpm =
      pattern.barBpmOverrides?.[currentBarIndex] ?? pattern.bpm;
    const effectiveBpm = currentBarBpm * playbackRate;
    const beatDuration = (60 / effectiveBpm) * (4 / beatUnit);
    const subdivisionDuration = beatDuration / SUBDIVISIONS_PER_BEAT;
    const subdivisionsInCurrentBar = currentSubdivision % subdivisionsPerBar;
    totalSeconds += subdivisionsInCurrentBar * subdivisionDuration;

    // 减去从 bar 0 到 rangeStartBar 的时间（range start 之前的时间不应计入）
    let rangeStartOffset = 0;
    for (let barIndex = 0; barIndex < rangeStartBar; barIndex++) {
      const barBpm = pattern.barBpmOverrides?.[barIndex] ?? pattern.bpm;
      const effectiveBpm = barBpm * playbackRate;
      const beatDuration = (60 / effectiveBpm) * (4 / beatUnit);
      const barDuration = beatDuration * beatsPerBar;
      rangeStartOffset += barDuration;
    }

    positionSecondsRef.current = totalSeconds - rangeStartOffset;
  }, [
    currentSubdivision,
    pattern.bpm,
    pattern.barBpmOverrides,
    beatUnit,
    playbackRate,
    rangeStartBar,
    beatsPerBar,
  ]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.playbackRate = Math.max(0.1, playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const volume = Math.max(0, Math.min(100, bgmConfig.volumePct ?? 100));
    const normalized = Math.max(0.0001, volume / 100);
    player.volume.value = Tone.gainToDb(normalized);
  }, [bgmConfig.volumePct]);

  // 监听 offset 变化，使用平滑过渡重新定位
  const lastOffsetRef = useRef(bgmConfig.offsetMs ?? 0);
  useEffect(() => {
    const player = playerRef.current;
    if (
      !player ||
      !isPlaying ||
      !isFullPracticeMode ||
      !bgmConfig.fileId ||
      !state.isLoaded
    ) {
      lastOffsetRef.current = bgmConfig.offsetMs ?? 0;
      return;
    }

    const lastOffset = lastOffsetRef.current;
    lastOffsetRef.current = bgmConfig.offsetMs ?? 0;

    // 只有当 offset 真正改变时才重新定位（避免不必要的重新定位）
    if (lastOffset !== (bgmConfig.offsetMs ?? 0)) {
      startFromCurrentPosition();
    }
  }, [
    bgmConfig.offsetMs,
    isPlaying,
    isFullPracticeMode,
    state.isLoaded,
    bgmConfig.fileId,
    startFromCurrentPosition,
  ]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (!isFullPracticeMode || !bgmConfig.fileId) {
      if (player.state === "started") {
        // 立即停止
        player.stop();
      }
      return;
    }

    if (!isPlaying) {
      if (player.state === "started") {
        player.stop();
      }
      return;
    }

    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    startFromCurrentPosition();
  }, [
    isPlaying,
    isFullPracticeMode,
    bgmConfig.fileId,
    bgmConfig.offsetMs,
    state.isLoaded,
    patternStartToken,
    startFromCurrentPosition,
  ]);

  useEffect(() => {
    if (
      !isPlaying ||
      !isFullPracticeMode ||
      !bgmConfig.fileId ||
      !state.isLoaded
    ) {
      lastSubdivisionRef.current = currentSubdivision;
      return;
    }

    const lastSubdivision = lastSubdivisionRef.current;
    lastSubdivisionRef.current = currentSubdivision;

    if (lastSubdivision === null) {
      return;
    }

    if (currentSubdivision < lastSubdivision) {
      // 循环播放时不需要平滑过渡
      startFromCurrentPosition();
    }
  }, [
    currentSubdivision,
    isPlaying,
    isFullPracticeMode,
    bgmConfig.fileId,
    state.isLoaded,
    startFromCurrentPosition,
  ]);

  useEffect(() => {
    lastSubdivisionRef.current = currentSubdivision;
  }, [currentSubdivision]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return state;
}
