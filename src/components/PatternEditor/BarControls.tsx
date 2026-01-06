import "./BarControls.css";

interface BarControlsProps {
  bars: number;
  onAddBar: (cursorPosition?: number) => void;
  onRemoveBar: (cursorPosition?: number) => void;
  canRemove: boolean;
  currentBeat?: number;
}

export function BarControls({
  bars,
  onAddBar,
  onRemoveBar,
  canRemove,
  currentBeat,
}: BarControlsProps) {
  return (
    <div className="bar-controls">
      <span className="bar-count">
        <button
          className="bar-control-button"
          onClick={() => onRemoveBar(currentBeat)}
          disabled={!canRemove}
          aria-label="Remove bar"
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
        {bars}
        <button
          className="bar-control-button"
          onClick={() => onAddBar(currentBeat)}
          aria-label="Add bar"
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
      </span>
    </div>
  );
}
