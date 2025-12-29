import type { Pattern } from "../../types";
import "./PatternTabs.css";

interface PatternTabsProps {
  patterns: Pattern[];
  currentPatternId?: string;
  onSelectPattern: (pattern: Pattern) => void;
}

export function PatternTabs({
  patterns,
  currentPatternId,
  onSelectPattern,
}: PatternTabsProps) {
  const handleTabClick = (pattern: Pattern) => {
    onSelectPattern(pattern);
  };

  // 按名称排序（数字顺序）
  const sortedPatterns = [...patterns].sort((a, b) => {
    const numA = parseInt(a.name, 10);
    const numB = parseInt(b.name, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pattern-tabs">
      {sortedPatterns.map((pattern) => {
        const active = pattern.id === currentPatternId;
        
        return (
          <button
            key={pattern.id}
            className={`pattern-tab ${active ? "active" : ""}`}
            onClick={() => handleTabClick(pattern)}
            aria-label={`Pattern ${pattern.name}`}
          >
            {pattern.name}
          </button>
        );
      })}
    </div>
  );
}

