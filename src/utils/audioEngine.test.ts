import { describe, it, expect, vi, beforeEach } from "vitest";

const rawContext = {
  state: "suspended",
  currentTime: 0,
  resume: vi.fn().mockResolvedValue(undefined),
};

const getContext = vi.fn(() => ({ rawContext }));
const start = vi.fn().mockResolvedValue(undefined);

vi.mock("tone", () => ({
  getContext,
  start,
}));

describe("audioEngine", () => {
  beforeEach(() => {
    rawContext.state = "suspended";
    getContext.mockClear();
    start.mockClear();
    vi.resetModules();
  });

  it("returns the Tone raw context", async () => {
    const { getAudioContext } = await import("./audioEngine");
    expect(getAudioContext()).toBe(rawContext);
  });

  it("starts the Tone context when suspended", async () => {
    const { resumeAudioContext } = await import("./audioEngine");
    await resumeAudioContext();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("skips Tone.start when running", async () => {
    const { resumeAudioContext } = await import("./audioEngine");
    rawContext.state = "running";
    await resumeAudioContext();
    expect(start).not.toHaveBeenCalled();
  });
});
