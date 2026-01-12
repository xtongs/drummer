/**
 * 剪贴板工具函数
 *
 * 处理各种浏览器和环境的兼容性问题：
 * - iOS Safari 在非 HTTPS 环境下的限制
 * - 旧浏览器不支持 navigator.clipboard API
 * - 权限相关问题
 */

/**
 * 复制文本到剪贴板
 *
 * 兼容性策略：
 * 1. 优先使用 navigator.clipboard.writeText（现代浏览器）
 * 2. 降级到 document.execCommand('copy')（旧浏览器和非 HTTPS 环境）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 方法1: 使用 navigator.clipboard API（现代浏览器，需要 HTTPS）
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // navigator.clipboard 失败，尝试降级方法
      console.log("navigator.clipboard.writeText failed, trying fallback");
    }
  }

  // 方法2: 使用 execCommand 降级方案
  try {
    return copyWithExecCommand(text);
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * 使用 document.execCommand 复制文本（降级方案）
 */
function copyWithExecCommand(text: string): boolean {
  // 创建临时 textarea
  const textArea = document.createElement("textarea");

  // 设置样式使其不可见
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  textArea.style.opacity = "0";
  textArea.style.zIndex = "-1";

  // 防止 iOS 上的缩放问题
  textArea.style.fontSize = "16px";

  textArea.value = text;
  document.body.appendChild(textArea);

  // iOS 特殊处理
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // iOS 需要特殊的选择方式
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textArea.setSelectionRange(0, text.length);
  } else {
    textArea.focus();
    textArea.select();
  }

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch (error) {
    console.error("execCommand copy failed:", error);
  }

  document.body.removeChild(textArea);
  return success;
}

/**
 * 从剪贴板读取文本
 *
 * 兼容性策略：
 * 1. 优先使用 navigator.clipboard.readText（现代浏览器，需要 HTTPS 和权限）
 * 2. 降级到 document.execCommand('paste')（大多数浏览器不支持，但尝试一下）
 * 3. 如果都失败，返回 null（调用方可以使用手动输入作为降级方案）
 *
 * 注意：剪贴板读取在非 HTTPS 环境下可能完全不可用
 */
export async function readFromClipboard(): Promise<string | null> {
  // 方法1: 使用 navigator.clipboard API
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.readText === "function"
  ) {
    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (error) {
      // 可能是权限问题或非 HTTPS 环境
      console.log("navigator.clipboard.readText failed:", error);
    }
  }

  // 方法2: 尝试使用 execCommand paste（通常不工作，但试一下）
  try {
    const text = await readWithExecCommand();
    if (text) {
      return text;
    }
  } catch (error) {
    console.log("execCommand paste failed:", error);
  }

  // 都失败，返回 null
  return null;
}

/**
 * 使用 document.execCommand 读取剪贴板（降级方案）
 * 注意：大多数现代浏览器出于安全原因不支持这个方法
 */
function readWithExecCommand(): Promise<string | null> {
  return new Promise((resolve) => {
    // 创建临时 textarea
    const textArea = document.createElement("textarea");
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    textArea.style.zIndex = "-1";
    textArea.style.fontSize = "16px";

    document.body.appendChild(textArea);
    textArea.focus();

    let success = false;
    try {
      success = document.execCommand("paste");
    } catch {
      // 忽略错误
    }

    const text = success ? textArea.value : null;
    document.body.removeChild(textArea);
    resolve(text);
  });
}

/**
 * 检查是否支持剪贴板读取
 * 用于提前判断是否可以使用剪贴板导入功能
 */
export function isClipboardReadSupported(): boolean {
  // 检查是否在安全上下文中（HTTPS 或 localhost）
  const isSecureContext =
    window.isSecureContext !== undefined
      ? window.isSecureContext
      : location.protocol === "https:" || location.hostname === "localhost";

  // 检查是否支持 navigator.clipboard.readText
  const hasClipboardAPI = !!(
    navigator.clipboard && typeof navigator.clipboard.readText === "function"
  );

  return isSecureContext && hasClipboardAPI;
}

/**
 * 检查是否支持剪贴板写入
 */
export function isClipboardWriteSupported(): boolean {
  // 检查是否在安全上下文中
  const isSecureContext =
    window.isSecureContext !== undefined
      ? window.isSecureContext
      : location.protocol === "https:" || location.hostname === "localhost";

  // 检查是否支持 navigator.clipboard.writeText
  const hasClipboardAPI = !!(
    navigator.clipboard && typeof navigator.clipboard.writeText === "function"
  );

  // 即使不在安全上下文，execCommand 也可能工作
  return (
    (isSecureContext && hasClipboardAPI) ||
    document.queryCommandSupported?.("copy")
  );
}
