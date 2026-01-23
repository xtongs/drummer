import { useEffect, useRef, useState } from "react";
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
}

interface BackgroundMusicState {
  isLoading: boolean;
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
}: UseBackgroundMusicPlayerOptions): BackgroundMusicState {
  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const fileIdRef = useRef<string | undefined>(undefined);
  const [state, setState] = useState<BackgroundMusicState>({
    isLoading: false,
    error: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const positionSecondsRef = useRef(0);
  const lastSubdivisionRef = useRef<number | null>(null);

  const startFromCurrentPosition = () => {
    const player = playerRef.current;
    if (!player) return;

    const ctx = getAudioContext();
    const baseTime = ctx.currentTime;
    const offsetSeconds = (bgmConfig.offsetMs ?? 0) / 1000;
    const effectiveRate = Math.max(0.1, playbackRateRef.current);

    // Pattern 当前播放时间（实际时间）
    const patternTime = positionSecondsRef.current;

    // offset 直接应用在实际时间上
    // 例如：offset = 10s，表示 BGM 提前 10 秒播放
    const adjustedPatternTime = patternTime - offsetSeconds;

    // 转换为 BGM 原始速率下的位置
    // 因为 Tone.js 的 startOffset 是相对于音频文件的，不受 playbackRate 影响
    const desiredBgmPosition = adjustedPatternTime / effectiveRate;

    const startDelay = adjustedPatternTime < 0 ? Math.abs(adjustedPatternTime) : 0;
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
    player.start(startTime, safeStartOffset);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadPlayer = async () => {
      if (!bgmConfig.fileId) {
        fileIdRef.current = undefined;
        setIsLoaded(false);
        if (playerRef.current) {
          playerRef.current.stop();
          playerRef.current.dispose();
          playerRef.current = null;
        }
        return;
      }

      if (bgmConfig.fileId === fileIdRef.current && playerRef.current) {
        return;
      }

      setState({ isLoading: true, error: null });
      setIsLoaded(false);
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
        // 初始化时立即设置音量
        const volume = Math.max(0, Math.min(100, bgmConfig.volumePct ?? 100));
        const normalized = Math.max(0.0001, volume / 100);
        player.volume.value = Tone.gainToDb(normalized);
        playerRef.current = player;
        fileIdRef.current = bgmConfig.fileId;
        setIsLoaded(true);
        setState({ isLoading: false, error: null });
      } catch (error) {
        if (!isCancelled) {
          setIsLoaded(false);
          setState({
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to load background music",
          });
        }
      }
    };

    void loadPlayer();

    return () => {
      isCancelled = true;
    };
  }, [bgmConfig.fileId]);

  useEffect(() => {
    // 计算实际播放时间（考虑 playbackRate）
    const effectiveBpm = pattern.bpm * playbackRate;
    const beatDuration = (60 / effectiveBpm) * (4 / pattern.timeSignature[1]);
    const subdivisionDuration = beatDuration / SUBDIVISIONS_PER_BEAT;
    positionSecondsRef.current =
      currentSubdivision * subdivisionDuration;
  }, [
    currentSubdivision,
    pattern.bpm,
    pattern.timeSignature,
    playbackRate,
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
    if (!player || !isPlaying || !isFullPracticeMode || !bgmConfig.fileId || !isLoaded) {
      lastOffsetRef.current = bgmConfig.offsetMs ?? 0;
      return;
    }

    const lastOffset = lastOffsetRef.current;
    lastOffsetRef.current = bgmConfig.offsetMs ?? 0;

    // 只有当 offset 真正改变时才重新定位（避免不必要的重新定位）
    if (lastOffset !== (bgmConfig.offsetMs ?? 0)) {
      startFromCurrentPosition();
    }
  }, [bgmConfig.offsetMs, isPlaying, isFullPracticeMode, isLoaded, bgmConfig.fileId]);

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
    lastSubdivisionRef.current = currentSubdivision;
  }, [
    isPlaying,
    isFullPracticeMode,
    bgmConfig.fileId,
    bgmConfig.offsetMs,
    isLoaded,
    patternStartToken,
  ]);

  useEffect(() => {
    if (!isPlaying || !isFullPracticeMode || !bgmConfig.fileId || !isLoaded) {
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
    isLoaded,
  ]);

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
