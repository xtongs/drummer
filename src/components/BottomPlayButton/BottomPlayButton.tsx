import "./BottomPlayButton.css";

interface BottomPlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
}

export function BottomPlayButton({
  isPlaying,
  onClick,
}: BottomPlayButtonProps) {

  return (
    <div className="bottom-play-button-container">
      <button
        className="bottom-play-button"
        onClick={onClick}
        aria-label={isPlaying ? "Pause Metronome" : "Play Metronome"}
      >
        {isPlaying ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="play-icon"
          >
            <polygon points="6 3 18 12 6 21" />
          </svg>
        )}
      </button>
    </div>
  );
}
