import "./BPMControl.css";
import { useLongPress } from "../../hooks/useLongPress";

interface BPMControlProps {
  bpm: number;
  onChange: (bpm: number) => void;
  min?: number;
  max?: number;
}

export function BPMControl({
  bpm,
  onChange,
  min = 40,
  max = 200,
}: BPMControlProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= min && value <= max) {
      onChange(value);
    }
  };

  const handleDecrease = () => {
    if (bpm > min) {
      onChange(bpm - 1);
    }
  };

  const handleIncrease = () => {
    if (bpm < max) {
      onChange(bpm + 1);
    }
  };

  const decreasePressHandlers = useLongPress(handleDecrease, {
    shouldStop: () => bpm <= min,
  });

  const increasePressHandlers = useLongPress(handleIncrease, {
    shouldStop: () => bpm >= max,
  });

  return (
    <div className="bpm-control">
      <label className="bpm-label">BPM</label>
      <div className="bpm-input-group">
        <button
          className="bpm-button"
          {...decreasePressHandlers}
          disabled={bpm <= min}
          aria-label="Decrease BPM"
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
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <input
          type="number"
          className="bpm-input"
          value={bpm}
          onChange={handleInputChange}
          min={min}
          max={max}
          aria-label="BPM value"
        />
        <button
          className="bpm-button"
          {...increasePressHandlers}
          disabled={bpm >= max}
          aria-label="Increase BPM"
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

