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
  patternStartTime: number | null;
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
  patternStartTime,
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
    const baseTime = patternStartTime ?? ctx.currentTime;
    const offsetSeconds = (bgmConfig.offsetMs ?? 0) / 1000;
    const desiredBgmPosition = positionSecondsRef.current - offsetSeconds;
    const startDelay = desiredBgmPosition < 0 ? Math.abs(desiredBgmPosition) : 0;
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

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (!isFullPracticeMode || !bgmConfig.fileId) {
      if (player.state === "started") {
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
      startFromCurrentPosition();
    }
  }, [
    currentSubdivision,
    isPlaying,
    isFullPracticeMode,
    bgmConfig.fileId,
    isLoaded,
    bgmConfig.offsetMs,
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
