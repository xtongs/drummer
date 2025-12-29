import "./GridCell.css";

interface GridCellProps {
  isActive: boolean;
  onClick: () => void;
  isCurrentBeat?: boolean;
}

export function GridCell({ isActive, onClick, isCurrentBeat }: GridCellProps) {
  return (
    <button
      className={`grid-cell ${isActive ? "active" : ""} ${
        isCurrentBeat ? "current-beat" : ""
      }`}
      onClick={onClick}
      type="button"
      aria-label={isActive ? "Active" : "Inactive"}
    />
  );
}

