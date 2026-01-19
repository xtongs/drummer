import { useState, useEffect, useCallback, useMemo } from "react";
import { LegacyDrumNotation, type DrumNotationProps } from "./LegacyDrumNotation";
import { VexFlowDrumNotation } from "./VexFlowDrumNotation";
import {
  getNotationRenderer,
  type NotationRenderer,
} from "../../utils/storage";

export type { DrumNotationProps };

// 自定义事件名，用于跨组件通知渲染器切换
export const RENDERER_CHANGE_EVENT = "drummer-renderer-change";

/**
 * DrumNotation wrapper 组件
 * 根据设置选择 VexFlow 或 Legacy 渲染器
 * 统一交互事件（double click / double tap）
 * 提供 VexFlow 渲染异常时的自动回退
 */
export function DrumNotation(props: DrumNotationProps) {
  const [renderer, setRenderer] = useState<NotationRenderer>(() =>
    getNotationRenderer()
  );
  const [fallbackToLegacy, setFallbackToLegacy] = useState(false);

  // 监听渲染器变更事件
  useEffect(() => {
    const handleRendererChange = () => {
      setRenderer(getNotationRenderer());
      setFallbackToLegacy(false); // 重置 fallback 状态
    };

    window.addEventListener(RENDERER_CHANGE_EVENT, handleRendererChange);
    return () => {
      window.removeEventListener(RENDERER_CHANGE_EVENT, handleRendererChange);
    };
  }, []);

  // 处理 VexFlow 渲染错误
  const handleVexFlowError = useCallback(() => {
    console.error("VexFlow rendering failed, falling back to Legacy renderer");
    setFallbackToLegacy(true);
  }, []);

  // 决定使用哪个渲染器
  const useVexFlow = useMemo(() => {
    return renderer === "vexflow" && !fallbackToLegacy;
  }, [renderer, fallbackToLegacy]);

  if (useVexFlow) {
    return (
      <VexFlowErrorBoundary onError={handleVexFlowError}>
        <VexFlowDrumNotation {...props} />
      </VexFlowErrorBoundary>
    );
  }

  return <LegacyDrumNotation {...props} />;
}

/**
 * VexFlow 渲染错误边界
 * 捕获渲染错误并触发 fallback
 */
interface VexFlowErrorBoundaryProps {
  children: React.ReactNode;
  onError: () => void;
}

interface VexFlowErrorBoundaryState {
  hasError: boolean;
}

import { Component, type ErrorInfo } from "react";

class VexFlowErrorBoundary extends Component<
  VexFlowErrorBoundaryProps,
  VexFlowErrorBoundaryState
> {
  constructor(props: VexFlowErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): VexFlowErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("VexFlow rendering error:", error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      // 返回 null，让父组件使用 fallback
      return null;
    }

    return this.props.children;
  }
}
