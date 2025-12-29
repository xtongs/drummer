import "./BarControls.css";

interface BarControlsProps {
  bars: number;
  onAddBar: () => void;
  onRemoveBar: () => void;
  canRemove: boolean;
}

export function BarControls({
  bars,
  onAddBar,
  onRemoveBar,
  canRemove,
}: BarControlsProps) {
  return (
    <div className="bar-controls">
      <span className="bar-count">
        Bars:
        <button
          className="bar-control-button"
          onClick={onRemoveBar}
          disabled={!canRemove}
          aria-label="Remove bar"
        >
          −
        </button>
        {bars}
        <button
          className="bar-control-button"
          onClick={onAddBar}
          aria-label="Add bar"
        >
          +
        </button>
      </span>
    </div>
  );
}
