import "./BeatDots.css";

interface BeatDotsProps {
  currentBeat: number;
  beatsPerBar: number;
}

export function BeatDots({ currentBeat, beatsPerBar }: BeatDotsProps) {
  return (
    <div className="beat-dots">
      {Array.from({ length: beatsPerBar }, (_, i) => (
        <div
          key={i}
          className={`beat-dot ${i === currentBeat ? "active" : ""}`}
        />
      ))}
    </div>
  );
}

