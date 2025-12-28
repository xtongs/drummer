import { useState, useRef, useEffect } from 'react';

// 节拍强度类型：0-静音，1-弱拍，2-次强拍，3-强拍
export type BeatStrength = 0 | 1 | 2 | 3;

export interface MetronomeOptions {
  initialBpm?: number;
  initialTimeSignature?: { beats: number; noteValue: number };
  initialIsPlaying?: boolean;
  initialSubdivision?: number;
  initialBeatStrengths?: BeatStrength[];
}

export interface MetronomeReturn {
  isPlaying: boolean;
  bpm: number;
  beat: number;
  subdivision: number;
  timeSignature: { beats: number; noteValue: number };
  beatStrengths: BeatStrength[];
  togglePlay: () => void;
  setBpm: (bpm: number) => void;
  incrementBpm: () => void;
  decrementBpm: () => void;
  setTimeSignature: (signature: { beats: number; noteValue: number }) => void;
  setSubdivision: (subdivision: number) => void;
  setBeatStrength: (beatIndex: number, strength: BeatStrength) => void;
  toggleBeatStrength: (beatIndex: number) => void;
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
    initialTimeSignature = { beats: 4, noteValue: 4 },
    initialIsPlaying = false,
    initialSubdivision = 4,
    initialBeatStrengths
  } = options;

  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [bpm, setBpm] = useState(initialBpm);
  const [beat, setBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);
  const [subdivision, setSubdivision] = useState(initialSubdivision);

  // 初始化节拍强度：默认第一拍为强拍，其他为弱拍
  const [beatStrengths, setBeatStrengths] = useState<BeatStrength[]>(() => {
    if (initialBeatStrengths) {
      return initialBeatStrengths;
    }
    // 生成默认节拍强度数组
    const strengths: BeatStrength[] = [];
    for (let i = 0; i < initialTimeSignature.beats; i++) {
      strengths.push(i === 0 ? 3 : 1); // 第一拍强拍，其他弱拍
    }
    return strengths;
  });

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

  // 播放节拍声音，根据节拍强度调整
  const playBeatSound = () => {
    // 计算当前是哪个主拍（考虑细分）
    const mainBeatIndex = Math.floor(beat / subdivision);

    // 获取当前主拍的强度
    const strength = beatStrengths[mainBeatIndex % beatStrengths.length];

    // 如果强度为0，不播放声音
    if (strength === 0) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;

    // 根据节拍强度调整音色和音量
    if (strength === 3) {
      // 强拍：两个振荡器产生更丰富的音色
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
    } else if (strength === 2) {
      // 次强拍：中等强度的音色
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.18);
    } else {
      // 弱拍：简单但真实的音色
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 较低的频率
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.type = 'sine';

      // 适中的音量和衰减
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  };

  // 节拍器逻辑，支持节拍细分
  useEffect(() => {
    if (isPlaying) {
      // 根据节拍细分计算实际间隔
      const interval = 60000 / (bpm * (subdivision / 4));

      intervalRef.current = setInterval(() => {
        playBeatSound();
        setBeat((prev) => (prev + 1) % (timeSignature.beats * subdivision));
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm, timeSignature, subdivision]);

  // 播放/暂停切换
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setBeat(0); // 开始新的小节
    }
  };

  // 递增BPM（根据当前值调整步长）
  const incrementBpm = () => {
    const step = bpm < 100 ? 10 : bpm < 200 ? 5 : 1;
    setBpm(Math.min(bpm + step, 400));
  };

  // 递减BPM（根据当前值调整步长）
  const decrementBpm = () => {
    const step = bpm < 100 ? 10 : bpm < 200 ? 5 : 1;
    setBpm(Math.max(bpm - step, 30));
  };

  // 更新时间签名时重置节拍
  const handleSetTimeSignature = (signature: { beats: number; noteValue: number }) => {
    setTimeSignature(signature);
    setBeat(0);
  };

  // 设置节拍细分
  const handleSetSubdivision = (newSubdivision: number) => {
    setSubdivision(newSubdivision);
    setBeat(0); // 重置节拍
  };

  // 设置特定节拍的强度
  const setBeatStrength = (beatIndex: number, strength: BeatStrength) => {
    setBeatStrengths(prev => {
      const newStrengths = [...prev];
      newStrengths[beatIndex % newStrengths.length] = strength;
      return newStrengths;
    });
  };

  // 切换特定节拍的强度（循环切换：0→1→2→3→0）
  const toggleBeatStrength = (beatIndex: number) => {
    setBeatStrengths(prev => {
      const newStrengths = [...prev];
      const currentStrength = newStrengths[beatIndex % newStrengths.length];
      newStrengths[beatIndex % newStrengths.length] = (currentStrength + 1) % 4 as BeatStrength;
      return newStrengths;
    });
  };

  // 当拍号变化时，更新节拍强度数组长度
  useEffect(() => {
    setBeatStrengths(prev => {
      const newLength = timeSignature.beats;
      const newStrengths: BeatStrength[] = [];

      // 保留现有强度值，不足则添加默认值，过多则截断
      for (let i = 0; i < newLength; i++) {
        if (i < prev.length) {
          newStrengths.push(prev[i]);
        } else {
          // 新添加的节拍默认强度：如果是第一拍则为强拍，否则为弱拍
          newStrengths.push(i === 0 ? 3 : 1);
        }
      }

      return newStrengths;
    });
  }, [timeSignature.beats]);

  return {
    isPlaying,
    bpm,
    beat,
    subdivision,
    timeSignature,
    beatStrengths,
    togglePlay,
    setBpm,
    incrementBpm,
    decrementBpm,
    setTimeSignature: handleSetTimeSignature,
    setSubdivision: handleSetSubdivision,
    setBeatStrength,
    toggleBeatStrength
  };
};
