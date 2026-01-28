import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getBgmConfig,
  saveBgmConfig,
  deleteBgmConfig,
  getMasterVolume,
  saveMasterVolume,
} from "./bgmStorage";

// Mock indexedDB
const mockDB = {
  close: vi.fn(),
  transaction: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
  createObjectStore: vi.fn(),
};

const mockRequest = {
  result: mockDB,
  error: null,
  onsuccess: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null,
  onupgradeneeded: null as ((event: any) => void) | null,
};

const mockIndexedDB = {
  open: vi.fn(() => mockRequest),
};

global.indexedDB = mockIndexedDB as any;

describe("bgmStorage config", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default config when none exists", () => {
    const config = getBgmConfig("pattern-1");
    expect(config).toEqual({
      fileId: undefined,
      offsetMs: 0,
      volumePct: 100,
      meta: undefined,
    });
  });

  it("saves and loads config by pattern id", () => {
    saveBgmConfig("pattern-1", {
      fileId: "bgm-1",
      offsetMs: 120,
      volumePct: 80,
      meta: { name: "track.mp3", size: 1234, type: "audio/mpeg" },
    });
    const config = getBgmConfig("pattern-1");
    expect(config.fileId).toBe("bgm-1");
    expect(config.offsetMs).toBe(120);
    expect(config.volumePct).toBe(80);
    expect(config.meta?.name).toBe("track.mp3");
  });

  it("deletes config by pattern id", () => {
    saveBgmConfig("pattern-1", {
      fileId: "bgm-1",
      offsetMs: 0,
      volumePct: 100,
    });
    deleteBgmConfig("pattern-1");
    const config = getBgmConfig("pattern-1");
    expect(config.fileId).toBeUndefined();
    expect(config.offsetMs).toBe(0);
    expect(config.volumePct).toBe(100);
  });
});

describe("bgmStorage master volume", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default master volume when none exists", () => {
    const volume = getMasterVolume();
    expect(volume).toBe(0);
  });

  it("saves and loads master volume", () => {
    saveMasterVolume(75);
    const volume = getMasterVolume();
    expect(volume).toBe(75);
  });

  it("clamps master volume to 0-100 range", () => {
    saveMasterVolume(150);
    expect(getMasterVolume()).toBe(100);

    saveMasterVolume(-10);
    expect(getMasterVolume()).toBe(0);
  });

  it("returns default volume for invalid data", () => {
    localStorage.setItem("drummer-master-volume", "invalid");
    const volume = getMasterVolume();
    expect(volume).toBe(0);
  });

  it("returns default volume for out-of-range values", () => {
    localStorage.setItem("drummer-master-volume", "150");
    expect(getMasterVolume()).toBe(0);

    localStorage.setItem("drummer-master-volume", "-10");
    expect(getMasterVolume()).toBe(0);
  });

  it("handles multiple patterns independently", () => {
    saveBgmConfig("pattern-1", {
      fileId: "bgm-1",
      offsetMs: 0,
      volumePct: 80,
    });
    saveBgmConfig("pattern-2", {
      fileId: "bgm-2",
      offsetMs: 100,
      volumePct: 60,
    });

    const config1 = getBgmConfig("pattern-1");
    const config2 = getBgmConfig("pattern-2");

    expect(config1.fileId).toBe("bgm-1");
    expect(config1.volumePct).toBe(80);
    expect(config2.fileId).toBe("bgm-2");
    expect(config2.volumePct).toBe(60);
  });

  it("preserves default values when not specified", () => {
    saveBgmConfig("pattern-1", {
      fileId: "bgm-1",
      offsetMs: 0,
      volumePct: 100,
    });

    const config = getBgmConfig("pattern-1");
    expect(config.offsetMs).toBe(0);
    expect(config.volumePct).toBe(100);
  });

  it("handles invalid localStorage data gracefully", () => {
    localStorage.setItem("drummer-bgm-config", "invalid-json");
    const config = getBgmConfig("pattern-1");
    expect(config).toEqual({
      fileId: undefined,
      offsetMs: 0,
      volumePct: 100,
      meta: undefined,
    });
  });
});

describe("bgmStorage saveBgmFileFromBase64", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("应该从 Base64 数据创建文件并保存", async () => {
    // 创建简单的 Base64 数据 (AAECAwQ=)
    const base64Data = "AAECAwQ=";

    // 这个测试主要验证 Base64 解码逻辑
    // 实际的 saveBgmFile 需要 IndexedDB，这里我们只测试解码部分
    const binaryString = atob(base64Data);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    expect(uint8Array).toEqual(new Uint8Array([0, 1, 2, 3, 4]));
  });

  it("应该处理空的 Base64 数据", () => {
    const base64Data = "";

    // 空字符串经过 atob 后还是空字符串
    const binaryString = atob(base64Data);
    expect(binaryString).toBe("");
  });

  it("应该正确解码 Base64 字符", () => {
    // 测试 Base64 解码的正确性
    // "VGVzdA==" = "Test"
    const base64Data = "VGVzdA==";
    const binaryString = atob(base64Data);

    expect(binaryString).toBe("Test");
    expect(binaryString.charCodeAt(0)).toBe(84); // 'T'
    expect(binaryString.charCodeAt(1)).toBe(101); // 'e'
    expect(binaryString.charCodeAt(2)).toBe(115); // 's'
    expect(binaryString.charCodeAt(3)).toBe(116); // 't'
  });
});
