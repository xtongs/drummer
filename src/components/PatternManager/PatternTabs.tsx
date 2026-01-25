import { useState, useRef, useEffect } from "react";
import type { Pattern } from "../../types";
import { useSingleLongPress } from "../../hooks/useSingleLongPress";
import { importPatternFromZip } from "../../utils/patternBackup";
import "./PatternTabs.css";
import "../PatternEditor/PatternEditor.css";

interface PatternTabsProps {
  patterns: Pattern[];
  currentPatternId?: string;
  onSelectPattern: (pattern: Pattern) => void;
  onSelectDraft: () => void;
  onAddPattern: () => void;
  onImportPattern?: (jsonString: string) => void;
  onImportPatternWithBgm?: (
    patternJsonString: string,
    bgmConfig?: { fileId?: string; offsetMs: number; volumePct: number; meta?: { name: string; size: number; type: string } },
  ) => void;
  isDraftMode: boolean;
}

export function PatternTabs({
  patterns,
  currentPatternId,
  onSelectPattern,
  onSelectDraft,
  onAddPattern,
  onImportPattern,
  onImportPatternWithBgm,
  isDraftMode,
}: PatternTabsProps) {
  const [isImportMode, setIsImportMode] = useState(false);
  const [importValue, setImportValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabClick = (pattern: Pattern) => {
    onSelectPattern(pattern);
  };

  // 长按处理：打开文件选择器，导入 zip 文件
  const handleLongPressAdd = async () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      alert("Please select a valid pattern file (.zip format)");
      return;
    }

    try {
      const { pattern: importedPattern, bgmConfig } = await importPatternFromZip(file);

      // 将导入的节奏型转换为 JSON 字符串
      const jsonString = JSON.stringify(importedPattern);

      // 优先使用新的 onImportPatternWithBgm 回调（包含 BGM 配置）
      if (onImportPatternWithBgm) {
        onImportPatternWithBgm(jsonString, bgmConfig);
      } else if (onImportPattern) {
        // 降级到旧的回调（不包含 BGM 配置）
        onImportPattern(jsonString);
      }

      console.log("Pattern imported from zip file", { bgmConfig });
    } catch (error) {
      console.error("Failed to import pattern:", error);
      alert(
        "Failed to import pattern file. Please check the console for details.",
      );
    } finally {
      // 清空input，允许重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 确认导入
  const handleConfirmImport = () => {
    if (importValue.trim() && onImportPattern) {
      onImportPattern(importValue.trim());
    }
    setIsImportMode(false);
    setImportValue("");
  };

  // 取消导入（点击其他地方或按 Escape）
  const handleCancelImport = () => {
    setIsImportMode(false);
    setImportValue("");
  };

  // 进入导入模式时自动聚焦输入框
  useEffect(() => {
    if (isImportMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isImportMode]);

  // + 按钮的长按事件处理
  const addButtonLongPressProps = useSingleLongPress({
    delay: 500,
    onLongPress: handleLongPressAdd,
    onClick: onAddPattern,
  });

  // 按名称排序（字母顺序）
  const sortedPatterns = [...patterns].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pattern-tabs">
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

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
      <div className="pattern-tabs-content">
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
      </div>

      {/* 添加按钮 / 导入输入框 */}
      {isImportMode ? (
        <div className="import-input-container">
          <input
            ref={inputRef}
            type="text"
            className="import-input"
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleConfirmImport();
              } else if (e.key === "Escape") {
                handleCancelImport();
              }
            }}
            onBlur={() => {
              // 延迟取消，以便确认按钮的点击事件能够触发
              setTimeout(() => {
                if (!importValue.trim()) {
                  handleCancelImport();
                }
              }, 150);
            }}
            placeholder="Paste..."
          />
          <button
            className="action-button confirm-button"
            onClick={handleConfirmImport}
            aria-label="Confirm Import"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          className="action-button save-button"
          {...addButtonLongPressProps}
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
      )}
    </div>
  );
}
