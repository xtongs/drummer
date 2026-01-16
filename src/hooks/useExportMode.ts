import { useState, useRef, useEffect, useCallback } from "react";
import {
  copyToClipboard,
  isClipboardWriteSupported,
} from "../utils/clipboard";

interface UseExportModeReturn {
  /** 是否处于导出模式 */
  isExportMode: boolean;
  /** 导出的值 */
  exportValue: string;
  /** 导出输入框的 ref */
  exportInputRef: React.RefObject<HTMLInputElement>;
  /** 进入导出模式 */
  enterExportMode: () => void;
  /** 取消导出模式 */
  cancelExport: () => void;
  /** 尝试导出到剪贴板，失败则进入手动复制模式 */
  tryExportToClipboard: () => Promise<boolean>;
}

/**
 * 管理导出模式的状态和逻辑
 * @param content - 要导出的内容
 * @returns 导出模式的状态和控制方法
 */
export function useExportMode(content: string): UseExportModeReturn {
  const [isExportMode, setIsExportMode] = useState(false);
  const [exportValue, setExportValue] = useState("");
  const exportInputRef = useRef<HTMLInputElement>(null);

  // 进入导出模式时自动聚焦并选中输入框内容
  useEffect(() => {
    if (isExportMode && exportInputRef.current) {
      exportInputRef.current.focus();
      exportInputRef.current.select();
    }
  }, [isExportMode]);

  // 进入导出模式
  const enterExportMode = useCallback(() => {
    setExportValue(content);
    setIsExportMode(true);
  }, [content]);

  // 取消导出模式
  const cancelExport = useCallback(() => {
    setIsExportMode(false);
    setExportValue("");
  }, []);

  // 尝试导出到剪贴板，失败则进入手动复制模式
  const tryExportToClipboard = useCallback(async (): Promise<boolean> => {
    // 如果支持剪贴板写入，先尝试自动写入
    if (isClipboardWriteSupported()) {
      try {
        const success = await copyToClipboard(content);
        if (success) {
          return true;
        }
      } catch {
        // 写入失败，继续进入手动复制模式
      }
    }

    // 不支持或写入失败，进入手动复制模式
    setExportValue(content);
    setIsExportMode(true);
    return false;
  }, [content]);

  return {
    isExportMode,
    exportValue,
    exportInputRef,
    enterExportMode,
    cancelExport,
    tryExportToClipboard,
  };
}
