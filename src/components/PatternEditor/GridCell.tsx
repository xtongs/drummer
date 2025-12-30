import "./GridCell.css";
import { playDrumSound } from "../../utils/audioEngine";
import type { DrumType } from "../../types";

interface GridCellProps {
  isActive: boolean;
  onClick: () => void;
  isCurrentBeat?: boolean;
  drumType?: DrumType;
}

export function GridCell({ isActive, onClick, isCurrentBeat, drumType }: GridCellProps) {
  const handleClick = () => {
    // 点击时播放对应的鼓件声音
    if (drumType) {
      playDrumSound(drumType);
    }
    onClick();
  };

  return (
    <button
      className={`grid-cell ${isActive ? "active" : ""} ${
        isCurrentBeat ? "current-beat" : ""
      }`}
      onClick={handleClick}
      type="button"
      aria-label={isActive ? "Active" : "Inactive"}
    />
  );
}

