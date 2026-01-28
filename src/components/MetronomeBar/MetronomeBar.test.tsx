import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MetronomeBar } from "./MetronomeBar";
import { BPM_RATES, BPM_RATE_LABELS } from "../../utils/constants";

vi.mock("../../hooks/useMetronome", () => ({
  useMetronome: () => ({ currentBeat: 0 }),
}));

vi.mock("../../hooks/useLongPress", () => ({
  useLongPress: () => ({}),
}));

describe("MetronomeBar - BPM 点击变速", () => {
  it("左侧点击应该 next：rateIndex+1", () => {
    const onBPMChange = vi.fn();
    const onRateIndexChange = vi.fn();

    render(
      <MetronomeBar
        bpm={100}
        timeSignature={[4, 4]}
        isPlaying={false}
        onBPMChange={onBPMChange}
        isPatternPlaying={false}
        rateIndex={0}
        onRateIndexChange={onRateIndexChange}
        rates={BPM_RATES}
        rateLabels={BPM_RATE_LABELS}
      />,
    );

    fireEvent.click(screen.getByLabelText("BPM rate next"));

    expect(onRateIndexChange).toHaveBeenCalledWith(1);
    expect(onBPMChange).not.toHaveBeenCalled();
  });

  it("右侧点击应该 prev：从 0 wrap 到最后一个倍率", () => {
    const onBPMChange = vi.fn();
    const onRateIndexChange = vi.fn();

    render(
      <MetronomeBar
        bpm={100}
        timeSignature={[4, 4]}
        isPlaying={false}
        onBPMChange={onBPMChange}
        isPatternPlaying={false}
        rateIndex={0}
        onRateIndexChange={onRateIndexChange}
        rates={BPM_RATES}
        rateLabels={BPM_RATE_LABELS}
      />,
    );

    fireEvent.click(screen.getByLabelText("BPM rate prev"));

    // rateIndex + (len - 1)
    expect(onRateIndexChange).toHaveBeenCalledWith(BPM_RATES.length - 1);
    expect(onBPMChange).not.toHaveBeenCalled();
  });

  it("右侧点击应该 prev：从 x0.9 回到原速（rateIndex + len - 1）", () => {
    const onBPMChange = vi.fn();
    const onRateIndexChange = vi.fn();

    render(
      <MetronomeBar
        bpm={90}
        timeSignature={[4, 4]}
        isPlaying={false}
        onBPMChange={onBPMChange}
        isPatternPlaying={false}
        rateIndex={1}
        onRateIndexChange={onRateIndexChange}
        rates={BPM_RATES}
        rateLabels={BPM_RATE_LABELS}
      />,
    );

    fireEvent.click(screen.getByLabelText("BPM rate prev"));

    expect(onRateIndexChange).toHaveBeenCalledWith(1 + BPM_RATES.length - 1);
    expect(onBPMChange).not.toHaveBeenCalled();
  });
});
