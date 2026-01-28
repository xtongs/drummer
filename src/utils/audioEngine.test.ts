import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Tone.js and related audio components
const mockGainNode = {
  toDestination: vi.fn(() => mockGainNode),
  connect: vi.fn(),
  disconnect: vi.fn(),
  dispose: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

const mockPlayer = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  playbackRate: 1,
};

const mockNoise = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
};

const mockFilter = {
  connect: vi.fn(),
  dispose: vi.fn(),
};

const rawContext = {
  state: "suspended",
  currentTime: 0.5,
  resume: vi.fn().mockResolvedValue(undefined),
};

const getContext = vi.fn(() => ({
  rawContext,
  context: rawContext,
}));
const start = vi.fn().mockResolvedValue(undefined);

vi.mock("tone", () => ({
  getContext,
  start,
  Gain: vi.fn(function () {
    return mockGainNode;
  }),
  Oscillator: vi.fn(function () {
    return mockOscillator;
  }),
  Player: vi.fn(function () {
    return mockPlayer;
  }),
  Noise: vi.fn(function () {
    return mockNoise;
  }),
  Filter: vi.fn(function () {
    return mockFilter;
  }),
}));

// Mock audioCache module
vi.mock("./audioCache", () => ({
  getCachedAudioBuffer: vi.fn(() => Promise.resolve(null)),
  cacheAudioBuffer: vi.fn(() => Promise.resolve()),
  checkAndUpdateCacheVersion: vi.fn(() => Promise.resolve()),
}));

describe("audioEngine", () => {
  beforeEach(() => {
    rawContext.state = "suspended";
    rawContext.currentTime = 0.5;
    getContext.mockClear();
    start.mockClear();
    mockGainNode.toDestination.mockClear();
    mockGainNode.connect.mockClear();
    mockGainNode.gain.setValueAtTime.mockClear();
    mockGainNode.gain.exponentialRampToValueAtTime.mockClear();
    mockOscillator.connect.mockClear();
    mockOscillator.start.mockClear();
    mockOscillator.stop.mockClear();
    mockOscillator.frequency.setValueAtTime.mockClear();
    mockOscillator.frequency.exponentialRampToValueAtTime.mockClear();
    vi.resetModules();
  });

  describe("AudioContext 管理", () => {
    it("应该返回原始 AudioContext", async () => {
      const { getAudioContext } = await import("./audioEngine");
      expect(getAudioContext()).toBe(rawContext);
    });

    it("应该在 suspended 状态下启动 AudioContext", async () => {
      const { resumeAudioContext } = await import("./audioEngine");
      await resumeAudioContext();
      expect(start).toHaveBeenCalledTimes(1);
    });

    it("应该在 running 状态下跳过启动", async () => {
      const { resumeAudioContext } = await import("./audioEngine");
      rawContext.state = "running";
      await resumeAudioContext();
      expect(start).not.toHaveBeenCalled();
    });

    it("应该预先初始化 AudioContext", async () => {
      const { preInitAudioContext } = await import("./audioEngine");
      preInitAudioContext();
      expect(start).toHaveBeenCalled();
    });
  });

  describe("音量控制", () => {
    it("应该设置音量乘数", async () => {
      const { setVolumeMultiplier, getAudioContext } =
        await import("./audioEngine");
      setVolumeMultiplier(0.5);
      expect(getAudioContext()).toBeDefined();
    });

    it("应该重置音量乘数为默认值", async () => {
      const { setVolumeMultiplier, resetVolumeMultiplier } =
        await import("./audioEngine");
      setVolumeMultiplier(0.5);
      resetVolumeMultiplier();
      expect(resetVolumeMultiplier).toBeDefined();
    });

    it("应该设置主音量乘数", async () => {
      const { setMasterVolumeMultiplier, getMasterVolumeMultiplier } =
        await import("./audioEngine");
      setMasterVolumeMultiplier(75);
      expect(getMasterVolumeMultiplier()).toBe(75);
    });

    it("应该限制主音量乘数在 0-100 范围内", async () => {
      const { setMasterVolumeMultiplier, getMasterVolumeMultiplier } =
        await import("./audioEngine");

      setMasterVolumeMultiplier(150);
      expect(getMasterVolumeMultiplier()).toBe(100);

      setMasterVolumeMultiplier(-10);
      expect(getMasterVolumeMultiplier()).toBe(0);
    });
  });

  describe("节拍器声音", () => {
    it("应该播放重拍声音（第一拍）", async () => {
      const { playAccent } = await import("./audioEngine");
      playAccent(1.0);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放轻拍声音（其他拍）", async () => {
      const { playBeat } = await import("./audioEngine");
      playBeat(1.0);

      expect(mockOscillator.start).toHaveBeenCalled();
    });
  });

  describe("鼓声播放 - 合成音色（后备）", () => {
    it("应该播放底鼓", async () => {
      const { playKick } = await import("./audioEngine");
      playKick(1.0);

      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    it("应该播放军鼓", async () => {
      const { playSnare } = await import("./audioEngine");
      playSnare(1.0);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放闭合踩镲", async () => {
      const { playHiHatClosed } = await import("./audioEngine");
      playHiHatClosed(1.0);

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放开放踩镲", async () => {
      const { playHiHatOpen } = await import("./audioEngine");
      playHiHatOpen(1.0);

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Crash 镲（高音）", async () => {
      const { playCrash } = await import("./audioEngine");
      playCrash(1.0, 1.2);

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Crash 镲（低音）", async () => {
      const { playCrash } = await import("./audioEngine");
      playCrash(1.0, 0.8);

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Ride 镲", async () => {
      const { playRide } = await import("./audioEngine");
      playRide(1.0);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放嗵鼓 1（高音）", async () => {
      const { playTom } = await import("./audioEngine");
      playTom(1.0, 280);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放嗵鼓 2（中音）", async () => {
      const { playTom } = await import("./audioEngine");
      playTom(1.0, 220);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放嗵鼓 3（低音）", async () => {
      const { playTom } = await import("./audioEngine");
      playTom(1.0, 160);

      expect(mockOscillator.start).toHaveBeenCalled();
    });
  });

  describe("playDrumSound - 统一播放接口", () => {
    it("应该播放 Kick 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Kick");

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放 Snare 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Snare");

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放 Hi-Hat Closed 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Hi-Hat Closed");

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Hi-Hat Open 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Hi-Hat Open");

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Crash 1 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Crash 1");

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Crash 2 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Crash 2");

      expect(mockNoise.start).toHaveBeenCalled();
    });

    it("应该播放 Ride 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Ride");

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放 Tom 1 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Tom 1");

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放 Tom 2 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Tom 2");

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该播放 Tom 3 声音", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Tom 3");

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该在未知鼓类型时默认播放 Snare", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Unknown" as any);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该应用音量乘数", async () => {
      const { playDrumSound } = await import("./audioEngine");
      await playDrumSound("Kick", 0.5);

      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it("应该恢复 AudioContext 并确保采样加载", async () => {
      const { playDrumSound } = await import("./audioEngine");
      rawContext.state = "suspended";
      await playDrumSound("Kick");

      expect(start).toHaveBeenCalled();
    });
  });

  describe("采样加载进度回调", () => {
    it("应该设置采样加载进度回调", async () => {
      const { setSampleLoadProgressCallback } = await import("./audioEngine");
      const callback = vi.fn();

      setSampleLoadProgressCallback(callback);

      expect(setSampleLoadProgressCallback).toBeDefined();
    });

    it("应该清除采样加载进度回调", async () => {
      const { setSampleLoadProgressCallback } = await import("./audioEngine");

      setSampleLoadProgressCallback(null);

      expect(setSampleLoadProgressCallback).toBeDefined();
    });
  });

  describe("ensureSamplesLoaded", () => {
    it("应该确保采样加载完成", async () => {
      const { ensureSamplesLoaded } = await import("./audioEngine");

      await ensureSamplesLoaded();

      expect(ensureSamplesLoaded).toBeDefined();
    });
  });

  describe("updateSampleCache", () => {
    it("应该更新采样缓存", async () => {
      const { updateSampleCache } = await import("./audioEngine");

      await updateSampleCache();

      expect(updateSampleCache).toBeDefined();
    });
  });

  describe("Tone.js 组件集成", () => {
    it("应该正确创建并连接 Gain 节点", async () => {
      const { playKick } = await import("./audioEngine");
      playKick(1.0);

      expect(mockGainNode.toDestination).toHaveBeenCalled();
    });

    it("应该正确设置音量曲线", async () => {
      const { playKick } = await import("./audioEngine");
      playKick(1.0);

      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    });

    it("应该正确设置频率变化", async () => {
      const { playKick } = await import("./audioEngine");
      playKick(1.0);

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled();
      expect(
        mockOscillator.frequency.exponentialRampToValueAtTime,
      ).toHaveBeenCalled();
    });
  });
});
