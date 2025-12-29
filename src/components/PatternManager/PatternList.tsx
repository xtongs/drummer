import type { Pattern } from "../../types";
import "./PatternList.css";

interface PatternListProps {
  patterns: Pattern[];
  currentPatternId?: string;
  onLoad: (pattern: Pattern) => void;
  onDelete: (patternId: string) => void;
  onClose: () => void;
}

export function PatternList({
  patterns,
  currentPatternId,
  onLoad,
  onDelete,
  onClose,
}: PatternListProps) {
  const handleDelete = (e: React.MouseEvent, patternId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this pattern?")) {
      onDelete(patternId);
    }
  };

  if (patterns.length === 0) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
          <h2 className="dialog-title">Load Pattern</h2>
          <p className="empty-message">No saved patterns</p>
          <button className="dialog-button save" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content pattern-list-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Load Pattern</h2>
        <div className="pattern-list">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className={`pattern-item ${
                pattern.id === currentPatternId ? "active" : ""
              }`}
              onClick={() => {
                onLoad(pattern);
                onClose();
              }}
            >
              <div className="pattern-item-info">
                <div className="pattern-item-name">{pattern.name}</div>
                <div className="pattern-item-meta">
                  BPM: {pattern.bpm} | {pattern.bars} bars |{" "}
                  {new Date(pattern.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                className="pattern-item-delete"
                onClick={(e) => handleDelete(e, pattern.id)}
                aria-label="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button className="dialog-button cancel" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

