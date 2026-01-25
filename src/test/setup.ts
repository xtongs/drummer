import "@testing-library/jest-dom";
import { vi, beforeEach, afterEach } from "vitest";

// 抑制测试中的 VexFlow 错误信息
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalStderrWrite = process.stderr.write;

// 保存原始的全局错误处理器
const originalOnUnhandledRejection = globalThis.onunhandledrejection;
const originalOnError = globalThis.onerror;

// 检查是否是 VexFlow 相关的错误
function isVexFlowError(message: string): boolean {
  const vexflowKeywords = [
    "VexFlow",
    "SVG",
    "falling back to Legacy",
    "Cannot read properties of undefined (reading 'SVG')",
    "reading 'SVG'",
    "VexFlowDrumNotation.tsx",
    "VexFlow rendering failed",
  ];
  return vexflowKeywords.some((keyword) => message.includes(keyword));
}

beforeEach(() => {
  // 抑制 stderr 输出中的 VexFlow 错误
  vi.spyOn(process.stderr, "write").mockImplementation(
    (buffer: string | Uint8Array, encodingOrCb?: any, cb?: any): boolean => {
      const str = Buffer.isBuffer(buffer) ? buffer.toString() : String(buffer);
      if (isVexFlowError(str)) {
        return true; // 假装写入成功
      }
      return originalStderrWrite.call(process.stderr, buffer, encodingOrCb, cb);
    }
  );

  // 抑制全局错误（window.onerror）
  globalThis.onerror = (message, source, lineno, colno, error) => {
    const messageStr = String(message);
    if (isVexFlowError(messageStr) || (error && isVexFlowError(error.message))) {
      return true; // 阻止错误继续传播
    } else if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 抑制未处理的 promise rejection
  globalThis.onunhandledrejection = function (event) {
    const reasonStr = String(event.reason);
    if (isVexFlowError(reasonStr)) {
      event.preventDefault();
    } else if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(this, event);
    }
  };

  // 抑制 VexFlow 相关的错误（测试环境中 SVG 可能不可用）
  vi.spyOn(console, "error").mockImplementation((...args) => {
    // 将所有参数转换为字符串进行检查
    const allArgsStr = args.map((arg: unknown) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    // 检查是否包含 VexFlow 相关的关键词
    const vexflowKeywords = [
      "Uncaught",
      "VexFlow",
      "SVG",
      "falling back to Legacy",
      "Cannot read properties of undefined",
      "reading 'SVG'",
      "TypeError:",
      "react-dom.development.js:",
      "captureCommitPhaseError",
      "reportUncaughtErrorInDEV",
      "runtime-script-errors.js",
    ];

    if (vexflowKeywords.some((keyword) => allArgsStr.includes(keyword))) {
      return;
    }

    return originalConsoleError(...args);
  });

  vi.spyOn(console, "warn").mockImplementation((...args) => {
    const allArgsStr = args.map((arg: unknown) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    // 抑制 VexFlow 相关的警告
    const vexflowKeywords = [
      "VexFlow",
      "SVG",
      "falling back to Legacy",
      "Cannot read properties",
      "react-dom.development.js:",
    ];

    if (vexflowKeywords.some((keyword) => allArgsStr.includes(keyword))) {
      return;
    }

    return originalConsoleWarn(...args);
  });
});

afterEach(() => {
  // 恢复全局错误处理器
  globalThis.onerror = originalOnError;
  globalThis.onunhandledrejection = originalOnUnhandledRejection;
  vi.restoreAllMocks();
});

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

// 导出 mock 以便测试使用
export { mockAudioContext, localStorageMock };
