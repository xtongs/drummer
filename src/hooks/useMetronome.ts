import { useState, useRef, useEffect } from 'react';

export interface MetronomeOptions {
  initialBpm?: number;
  initialTimeSignature?: number;
  initialIsPlaying?: boolean;
}

export interface MetronomeReturn {
  isPlaying: boolean;
  bpm: number;
  beat: number;
  timeSignature: number;
  togglePlay: () => void;
  setBpm: (bpm: number) => void;
  incrementBpm: () => void;
  decrementBpm: () => void;
  setTimeSignature: (signature: number) => void;
}

export const useMetronome = (options: MetronomeOptions = {}): MetronomeReturn => {
  const { 
    initialBpm = 120, 
    initialTimeSignature = 4, 
    initialIsPlaying = false 
  } = options;

  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [bpm, setBpm] = useState(initialBpm);
  const [beat, setBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 播放节拍声音
  const playBeatSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 重拍使用更高频率
    oscillator.frequency.setValueAtTime(
      beat === 0 ? 800 : 400,
      audioContext.currentTime
    );
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // 节拍器逻辑
  useEffect(() => {
    if (isPlaying) {
      const interval = 60000 / bpm;
      
      intervalRef.current = setInterval(() => {
        playBeatSound();
        setBeat((prev) => (prev + 1) % timeSignature);
      }, interval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm, timeSignature]);

  // 播放/暂停切换
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setBeat(0); // 开始新的小节
    }
  };

  // 递增BPM（根据当前值调整步长）
  const incrementBpm = () => {
    const step = bpm < 100 ? 20 : bpm < 200 ? 10 : 5;
    setBpm(Math.min(bpm + step, 300));
  };

  // 递减BPM（根据当前值调整步长）
  const decrementBpm = () => {
    const step = bpm <= 100 ? 20 : bpm <= 200 ? 10 : 5;
    setBpm(Math.max(bpm - step, 60));
  };

  // 更新时间签名时重置节拍
  const handleSetTimeSignature = (signature: number) => {
    setTimeSignature(signature);
    setBeat(0);
  };

  return {
    isPlaying,
    bpm,
    beat,
    timeSignature,
    togglePlay,
    setBpm,
    incrementBpm,
    decrementBpm,
    setTimeSignature: handleSetTimeSignature
  };
};
