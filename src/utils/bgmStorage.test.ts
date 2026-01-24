import { describe, it, expect, beforeEach } from "vitest";
import { getBgmConfig, saveBgmConfig, deleteBgmConfig } from "./bgmStorage";

describe("bgmStorage config", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default config when none exists", () => {
    const config = getBgmConfig("pattern-1");
    expect(config).toEqual({ fileId: undefined, offsetMs: 0, volumePct: 100, meta: undefined });
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
    saveBgmConfig("pattern-1", { fileId: "bgm-1", offsetMs: 0, volumePct: 100 });
    deleteBgmConfig("pattern-1");
    const config = getBgmConfig("pattern-1");
    expect(config.fileId).toBeUndefined();
    expect(config.offsetMs).toBe(0);
    expect(config.volumePct).toBe(100);
  });
});
