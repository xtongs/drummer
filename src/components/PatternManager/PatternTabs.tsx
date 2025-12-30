import type { Pattern } from "../../types";
import "./PatternTabs.css";
import "../PatternEditor/PatternEditor.css";

interface PatternTabsProps {
  patterns: Pattern[];
  currentPatternId?: string;
  onSelectPattern: (pattern: Pattern) => void;
  onSelectDraft: () => void;
  onAddPattern: () => void;
  isDraftMode: boolean;
}

export function PatternTabs({
  patterns,
  currentPatternId,
  onSelectPattern,
  onSelectDraft,
  onAddPattern,
  isDraftMode,
}: PatternTabsProps) {
  const handleTabClick = (pattern: Pattern) => {
    onSelectPattern(pattern);
  };

  // 按名称排序（字母顺序）
  const sortedPatterns = [...patterns].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pattern-tabs">
      {/* 草稿 Tab - 始终显示在最左边 */}
      <button
        className={`pattern-tab draft-tab ${isDraftMode ? "active" : ""}`}
        onClick={onSelectDraft}
        aria-label="Draft Pattern"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <circle
            cx="6"
            cy="6"
            r="4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {/* 已保存的 Pattern Tabs */}
      {sortedPatterns.map((pattern) => {
        const active = !isDraftMode && pattern.id === currentPatternId;

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

      {/* 添加按钮 - 在数字 tab 后面 */}
      <button
        className="action-button save-button"
        onClick={onAddPattern}
        aria-label="Create New Pattern"
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
    </div>
  );
}
