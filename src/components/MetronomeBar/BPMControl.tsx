import "./BPMControl.css";

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

  return (
    <div className="bpm-control">
      <label className="bpm-label">BPM</label>
      <div className="bpm-input-group">
        <button
          className="bpm-button"
          onClick={handleDecrease}
          disabled={bpm <= min}
          aria-label="Decrease BPM"
        >
          −
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
          onClick={handleIncrease}
          disabled={bpm >= max}
          aria-label="Increase BPM"
        >
          +
        </button>
      </div>
    </div>
  );
}

