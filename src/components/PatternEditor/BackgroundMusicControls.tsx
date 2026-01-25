import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { BgmConfig } from "../../utils/bgmStorage";
import { useLongPress } from "../../hooks/useLongPress";
import "./Grid.css";

interface BackgroundMusicControlsProps {
  config: BgmConfig;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onOffsetChange: (offsetMs: number) => void;
  onVolumeChange: (volumePct: number) => void;
  onDelete: () => void;
  masterVolume: number;
  onMasterVolumeChange: (volumePct: number) => void;
  isPlaying: boolean;
}

export function BackgroundMusicControls({
  config,
  isLoading,
  isLoaded,
  error,
  onUpload,
  onOffsetChange,
  onVolumeChange,
  onDelete,
  masterVolume,
  onMasterVolumeChange,
  isPlaying,
}: BackgroundMusicControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditingOffset, setIsEditingOffset] = useState(false);
  const [offsetInputValue, setOffsetInputValue] = useState("0");
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
    clickCallback: () => applyOffsetDelta(-10),
  });
  const offsetIncreaseHandlers = useLongPress(() => applyOffsetDelta(100), {
    clickCallback: () => applyOffsetDelta(10),
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
  const offsetDisplayValue = Math.round(negatedOffsetMs).toString();

  const enterOffsetEditMode = () => {
    if (isPlaying) return;
    setOffsetInputValue(offsetDisplayValue);
    setIsEditingOffset(true);
  };

  const commitOffsetValue = () => {
    const parsed = Number(offsetInputValue);
    if (!Number.isFinite(parsed)) {
      setIsEditingOffset(false);
      return;
    }
    onOffsetChange(-parsed);
    setIsEditingOffset(false);
  };

  const toggleBgmVolume = () => {
    const currentVolume = config.volumePct ?? 100;
    onVolumeChange(currentVolume === 0 ? 100 : 0);
  };

  const toggleMasterVolume = () => {
    onMasterVolumeChange(masterVolume === 0 ? 100 : 0);
  };

  return (
    <div className="bgm-controls-container">
      <div className="bgm-controls">
        <div className="bgm-controls-left">
          {config.fileId && isLoaded && !isLoading ? (
            <button
              type="button"
              className="bgm-delete-button"
              onClick={onDelete}
              aria-label="Delete background music"
              title="Delete background music"
              disabled={!config.fileId || isLoading}
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
          ) : (
            <>
              <button
                type="button"
                className="bgm-control-button"
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
                  <path d="M12 3v12" />
                  <polyline points="8 7 12 3 16 7" />
                  <path d="M4 21h16v0" />
                </svg>
              </button>
              <input
                ref={inputRef}
                className="bgm-file-input"
                type="file"
                accept="audio/mpeg"
                onChange={handleFileChange}
              />
            </>
          )}
          {fileName && (
            <>
              <span className="bgm-file-name">{fileName || ""}</span>
              <div className="bgm-control-group">
                <button
                  type="button"
                  className="bgm-control-button"
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
                  <button
                    type="button"
                    className="bgm-volume-display"
                    onClick={toggleBgmVolume}
                    aria-label="Toggle BGM volume"
                    title="Click to toggle 0%/100%"
                  >
                    <span className="bgm-control-value">{volumeDisplay}%</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="bgm-control-button"
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
              <div className="bgm-control-group">
                <button
                  type="button"
                  className="bgm-control-button"
                  aria-label="Decrease background music offset"
                  title="Decrease background music offset"
                  disabled={isPlaying}
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
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <div className="bgm-control-center">
                  {isEditingOffset ? (
                    <input
                      type="number"
                      className="bgm-offset-input"
                      value={offsetInputValue}
                      onChange={(event) =>
                        setOffsetInputValue(event.target.value)
                      }
                      onBlur={commitOffsetValue}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitOffsetValue();
                        } else if (event.key === "Escape") {
                          setIsEditingOffset(false);
                        }
                      }}
                      disabled={isPlaying}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="bgm-offset-display"
                      onClick={enterOffsetEditMode}
                      disabled={isPlaying}
                    >
                      <span className="bgm-control-value">{offsetDisplay}</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="bgm-control-button"
                  aria-label="Increase background music offset"
                  title="Increase background music offset"
                  disabled={isPlaying}
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
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
        <div className="bgm-controls-right">
          <div className="bgm-control-group">
            <button
              type="button"
              className="bgm-control-button"
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
              <button
                type="button"
                className="bgm-volume-display"
                onClick={toggleMasterVolume}
                aria-label="Toggle pattern volume"
                title="Click to toggle 0%/100%"
              >
                <span className="bgm-control-value">
                  {masterVolumeDisplay}%
                </span>
              </button>
            </div>
            <button
              type="button"
              className="bgm-control-button"
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
        </div>
      </div>
      {error && <div className="bgm-error">{error}</div>}
    </div>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
