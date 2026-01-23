import { useRef } from "react";
import type { ChangeEvent } from "react";
import type { BgmConfig } from "../../utils/bgmStorage";
import { useLongPress } from "../../hooks/useLongPress";
import "./Grid.css";

interface BackgroundMusicControlsProps {
  config: BgmConfig;
  isLoading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onOffsetChange: (offsetMs: number) => void;
  onVolumeChange: (volumePct: number) => void;
  onDelete: () => void;
  masterVolume: number;
  onMasterVolumeChange: (volumePct: number) => void;
}

export function BackgroundMusicControls({
  config,
  isLoading,
  error,
  onUpload,
  onOffsetChange,
  onVolumeChange,
  onDelete,
  masterVolume,
  onMasterVolumeChange,
}: BackgroundMusicControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const applyVolumeDelta = (delta: number) => {
    const next = clampNumber((config.volumePct ?? 100) + delta, 0, 100);
    onVolumeChange(next);
  };
  const applyMasterVolumeDelta = (delta: number) => {
    const next = clampNumber(masterVolume + delta, 0, 100);
    onMasterVolumeChange(next);
  };
  const applyOffsetDelta = (delta: number) => {
    const next = (config.offsetMs ?? 0) + delta;
    onOffsetChange(next);
  };
  const volumeDecreaseHandlers = useLongPress(() => applyVolumeDelta(-10), {
    clickCallback: () => applyVolumeDelta(-10),
  });
  const volumeIncreaseHandlers = useLongPress(() => applyVolumeDelta(10), {
    clickCallback: () => applyVolumeDelta(10),
  });
  const masterVolumeDecreaseHandlers = useLongPress(
    () => applyMasterVolumeDelta(-10),
    {
      clickCallback: () => applyMasterVolumeDelta(-10),
    },
  );
  const masterVolumeIncreaseHandlers = useLongPress(
    () => applyMasterVolumeDelta(10),
    {
      clickCallback: () => applyMasterVolumeDelta(10),
    },
  );
  const offsetDecreaseHandlers = useLongPress(() => applyOffsetDelta(-100), {
    clickCallback: () => applyOffsetDelta(-1),
  });
  const offsetIncreaseHandlers = useLongPress(() => applyOffsetDelta(100), {
    clickCallback: () => applyOffsetDelta(1),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    event.target.value = "";
  };

  // 去掉扩展名的文件名
  const fileName = (config.meta?.name ?? "").replace(/\.[^/.]+$/, "");
  const volumeDisplay = Math.round(config.volumePct ?? 100);
  const masterVolumeDisplay = Math.round(masterVolume);

  // offset 显示值乘以 -1，超过 1s 时显示秒
  const offsetMs = config.offsetMs ?? 0;
  const negatedOffsetMs = -offsetMs;
  const offsetDisplay =
    Math.abs(negatedOffsetMs) >= 1000
      ? `${(negatedOffsetMs / 1000).toFixed(3)}s`
      : `${negatedOffsetMs}ms`;

  return (
    <div className="bgm-controls-container">
      <div className="bgm-controls">
        <div className="bgm-controls-left">
          <button
            type="button"
            className="loop-range-button"
            onClick={() => inputRef.current?.click()}
            aria-label="Upload background music"
            title="Upload background music"
            disabled={isLoading}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
          <input
            ref={inputRef}
            className="bgm-file-input"
            type="file"
            accept="audio/mpeg"
            onChange={handleFileChange}
          />
          {config.fileId && !isLoading && (
            <button
              type="button"
              className="action-button delete-button"
              onClick={onDelete}
              aria-label="Delete background music"
              title="Delete background music"
              disabled={!config.fileId}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
          <span className="bgm-file-name">
            {isLoading ? "Loading..." : fileName || ""}
          </span>
          <div className="bgm-control-group">
            <button
              type="button"
              className="loop-range-button"
              aria-label="Decrease background music volume"
              title="Decrease background music volume"
              {...volumeDecreaseHandlers}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div className="bgm-control-center">
              <span className="bgm-control-value">{volumeDisplay}%</span>
            </div>
            <button
              type="button"
              className="loop-range-button"
              aria-label="Increase background music volume"
              title="Increase background music volume"
              {...volumeIncreaseHandlers}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="bgm-controls-right">
          <div className="bgm-control-group">
            <button
              type="button"
              className="loop-range-button"
              aria-label="Decrease pattern volume"
              title="Decrease pattern volume"
              {...masterVolumeDecreaseHandlers}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div className="bgm-control-center">
              <span className="bgm-control-value">{masterVolumeDisplay}%</span>
            </div>
            <button
              type="button"
              className="loop-range-button"
              aria-label="Increase pattern volume"
              title="Increase pattern volume"
              {...masterVolumeIncreaseHandlers}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <div className="bgm-control-group">
            <button
              type="button"
              className="loop-range-button"
              aria-label="Decrease background music offset"
              title="Decrease background music offset"
              {...offsetDecreaseHandlers}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div className="bgm-control-center">
              <span className="bgm-control-value">{offsetDisplay}</span>
            </div>
            <button
              type="button"
              className="loop-range-button"
              aria-label="Increase background music offset"
              title="Increase background music offset"
              {...offsetIncreaseHandlers}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {error && <div className="bgm-error">{error}</div>}
    </div>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
