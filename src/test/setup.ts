import "@testing-library/jest-dom";
import { vi, beforeEach, afterEach } from "vitest";

// Mock Web Audio API
const mockAudioContext = {
  currentTime: 0,
  state: "running",
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    type: "sine",
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null,
    playbackRate: { value: 1 },
  })),
  createBuffer: vi.fn((channels, length, sampleRate) => ({
    numberOfChannels: channels,
    length: length,
    sampleRate: sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
  })),
  createBiquadFilter: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: "lowpass",
    frequency: { value: 0 },
    Q: { value: 1 },
  })),
  decodeAudioData: vi.fn().mockResolvedValue({
    duration: 1,
    numberOfChannels: 2,
    sampleRate: 44100,
    length: 44100,
    getChannelData: vi.fn(() => new Float32Array(44100)),
  }),
  destination: {},
  sampleRate: 44100,
};

// 模拟 AudioContext
vi.stubGlobal("AudioContext", vi.fn(() => mockAudioContext));
vi.stubGlobal("webkitAudioContext", vi.fn(() => mockAudioContext));

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

const localStorageMock = createLocalStorageMock();
vi.stubGlobal("localStorage", localStorageMock);

// Mock fetch for audio samples
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
}));

// Mock Audio element
vi.stubGlobal("Audio", vi.fn(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  preload: "auto",
  volume: 1,
  src: "",
})));

// Mock requestAnimationFrame
vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
  setTimeout(() => callback(Date.now()), 16);
  return 1;
}));

vi.stubGlobal("cancelAnimationFrame", vi.fn());

// 在每个测试之前清理 localStorage
beforeEach(() => {
  localStorageMock.clear();
});

// 在每个测试之后清理所有的 mock
afterEach(() => {
  vi.clearAllMocks();
});

// 导出 mock 以便测试使用
export { mockAudioContext, localStorageMock };
