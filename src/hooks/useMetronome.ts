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
  // 从localStorage加载保存的BPM值，如果没有则使用默认值
  const getSavedBpm = () => {
    try {
      const savedBpm = localStorage.getItem('metronome_bpm');
      return savedBpm ? parseInt(savedBpm, 10) : (options.initialBpm || 120);
    } catch (error) {
      console.error('Failed to load saved BPM:', error);
      return options.initialBpm || 120;
    }
  };

  const {
    initialBpm = getSavedBpm(),
    initialTimeSignature = 4,
    initialIsPlaying = false
  } = options;

  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [bpm, setBpm] = useState(initialBpm);
  const [beat, setBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);

  // 当BPM变化时保存到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('metronome_bpm', bpm.toString());
    } catch (error) {
      console.error('Failed to save BPM:', error);
    }
  }, [bpm]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 播放节拍声音
  const playBeatSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;

    // 重拍使用更复杂的音色，普通拍使用简单音色
    if (beat === 0) {
      // 重拍：两个振荡器产生更丰富的音色
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 主音高
      osc1.frequency.setValueAtTime(800, audioContext.currentTime);
      osc1.type = 'square'; // 方波更有冲击力

      // 泛音
      osc2.frequency.setValueAtTime(1200, audioContext.currentTime);
      osc2.type = 'triangle';

      // 更大的音量和更慢的衰减
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      osc1.start(audioContext.currentTime);
      osc2.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.2);
      osc2.stop(audioContext.currentTime + 0.2);
    } else {
      // 普通拍：简单但真实的音色
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 较低的频率
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.type = 'sine';

      // 适中的音量和衰减
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
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
