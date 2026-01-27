import { useEffect, useState, useRef } from "react";
import { VERSION, BUILD_TIME } from "../../version";
import { useTheme } from "../../hooks/useTheme";
import { exportConfig, importConfig } from "../../utils/configBackup";
import "./Settings.css";

type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "activating"
  | "no-update";

export function Settings() {
  const [isVisible, setIsVisible] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [isExporting, setIsExporting] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentTheme, cycleTheme } = useTheme();

  // 重置超时定时器
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 10000); // 10秒后自动隐藏
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleShowVersion = () => {
      setIsVisible(true);
    };

    window.addEventListener("show-version", handleShowVersion);

    return () => {
      window.removeEventListener("show-version", handleShowVersion);
    };
  }, []);

  // 当组件可见时，设置超时隐藏和交互监听
  useEffect(() => {
    if (!isVisible) {
      // 如果组件不可见，清理所有监听器和定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // 启动初始超时定时器
    resetTimeout();

    // 监听用户交互事件
    const events = [
      "mousemove",
      "mousedown",
      "touchstart",
      "touchmove",
      "keydown",
      "click",
    ];

    const handleInteraction = () => {
      resetTimeout();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleInteraction);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible]);

  const handleRefresh = async () => {
    console.log("[Refresh] === handleRefresh started ===");
    console.log(
      "[Refresh] Current version:",
      VERSION,
      "Build time:",
      BUILD_TIME,
    );
    console.log("[Refresh] Set status: checking");
    setUpdateStatus("checking");

    try {
      if (!("serviceWorker" in navigator)) {
        console.log(
          "[Refresh] ❌ Browser doesn't support ServiceWorker, reloading page directly",
        );
        window.location.reload();
        return;
      }
      console.log("[Refresh] ✓ Browser supports ServiceWorker");

      console.log("[Refresh] Getting ServiceWorker registration...");
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        console.log(
          "[Refresh] ❌ No registration found, reloading page directly",
        );
        window.location.reload();
        return;
      }
      console.log("[Refresh] ✓ Got registration:", {
        scope: registration.scope,
        active: registration.active?.state,
        waiting: registration.waiting?.state,
        installing: registration.installing?.state,
      });

      // 监听控制器变更 - 这是SW真正接管页面的信号
      const reloadOnControllerChange = () => {
        console.log(
          "[Refresh] 🔄 controllerchange event triggered! Reloading page...",
        );
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        reloadOnControllerChange,
        { once: true },
      );
      console.log("[Refresh] ✓ Added controllerchange listener");

      // 如果已经有等待中的worker，直接激活它
      if (registration.waiting) {
        console.log("[Refresh] ⚡ Found waiting worker, activating directly");
        console.log(
          "[Refresh] waiting worker state:",
          registration.waiting.state,
        );
        setUpdateStatus("activating");
        console.log("[Refresh] Sending SKIP_WAITING message to waiting worker");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }
      console.log("[Refresh] No waiting worker currently");

      // 设置超时，避免iOS上无限等待
      console.log("[Refresh] Set 10 second timeout");
      const timeoutId = setTimeout(() => {
        console.log(
          "[Refresh] ⏰ 10s timeout! Removing listener and reloading page",
        );
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          reloadOnControllerChange,
        );
        window.location.reload();
      }, 10000); // 10秒超时

      // 监听updatefound事件来检测新的SW开始安装
      const handleUpdateFound = () => {
        console.log(
          "[Refresh] 🎉 updatefound event triggered! New SW started installing",
        );
        setUpdateStatus("downloading");
        const newWorker = registration.installing;
        if (!newWorker) {
          console.log(
            "[Refresh] ❌ updatefound triggered but installing is null",
          );
          return;
        }
        console.log("[Refresh] New worker initial state:", newWorker.state);

        newWorker.addEventListener("statechange", () => {
          console.log("[Refresh] New worker state changed:", newWorker.state);
          if (newWorker.state === "installing") {
            console.log("[Refresh] Set status: installing");
            setUpdateStatus("installing");
          }
          // 当新SW安装完成（进入waiting状态），通知它跳过等待
          if (newWorker.state === "installed") {
            console.log(
              "[Refresh] New worker installation complete, set status: activating",
            );
            setUpdateStatus("activating");
            clearTimeout(timeoutId);
            console.log("[Refresh] Cleared timeout timer");
            // newWorker 现在就是 waiting 状态的 worker
            console.log("[Refresh] Sending SKIP_WAITING message to new worker");
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      };

      registration.addEventListener("updatefound", handleUpdateFound, {
        once: true,
      });
      console.log("[Refresh] ✓ Added updatefound listener");

      // 触发更新检查
      console.log(
        "[Refresh] Calling registration.update() to check for updates...",
      );
      try {
        await registration.update();
        console.log("[Refresh] ✓ registration.update() completed");
      } catch (updateError) {
        console.warn("[Refresh] ⚠️ Update check failed:", updateError);
      }

      // 如果update()后立即有waiting的worker（可能已经下载好了）
      // 使用类型断言绕过TS控制流分析（await后属性可能改变）
      const waitingAfterUpdate = registration.waiting as ServiceWorker | null;
      console.log(
        "[Refresh] After update(), checking waiting:",
        waitingAfterUpdate?.state || "null",
      );
      if (waitingAfterUpdate) {
        console.log(
          "[Refresh] ⚡ Found waiting worker after update(), activating directly",
        );
        setUpdateStatus("activating");
        clearTimeout(timeoutId);
        console.log("[Refresh] Sending SKIP_WAITING message");
        waitingAfterUpdate.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // 如果没有新的SW（没有更新），超时后会自动刷新
      // 或者可以在这里检查是否真的没有更新
      console.log("[Refresh] Set 5 second no-update detection timer");
      const checkNoUpdate = setTimeout(() => {
        console.log("[Refresh] ⏰ 5s check: checking for updates...");
        console.log(
          "[Refresh] installing:",
          registration.installing?.state || "null",
        );
        console.log(
          "[Refresh] waiting:",
          registration.waiting?.state || "null",
        );
        // 如果5秒内没有触发updatefound，说明可能没有新版本
        if (!registration.installing && !registration.waiting) {
          console.log(
            "[Refresh] 📌 Confirmed no update, set status: no-update",
          );
          setUpdateStatus("no-update");
          clearTimeout(timeoutId);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            reloadOnControllerChange,
          );
          // 1秒后刷新，让用户看到"已是最新"
          console.log("[Refresh] Reloading page in 1 second...");
          setTimeout(() => {
            console.log("[Refresh] 🔄 Executing page reload");
            window.location.reload();
          }, 1000);
        } else {
          console.log(
            "[Refresh] Found installing or waiting, continuing to wait",
          );
        }
      }, 5000);

      // 清理
      registration.addEventListener(
        "updatefound",
        () => {
          console.log(
            "[Refresh] updatefound triggered, clearing no-update detection timer",
          );
          clearTimeout(checkNoUpdate);
        },
        { once: true },
      );
      console.log(
        "[Refresh] === handleRefresh initialization complete, waiting for events ===",
      );
    } catch (error) {
      console.error("[Refresh] ❌ Exception:", error);
      console.log("[Refresh] Reloading page due to exception");
      window.location.reload();
    }
  };

  const getStatusText = () => {
    switch (updateStatus) {
      case "checking":
        return "Checking...";
      case "downloading":
        return "Downloading...";
      case "installing":
        return "Installing...";
      case "activating":
        return "Activating...";
      case "no-update":
        return "Latest version";
      default:
        return `v${VERSION} - ${BUILD_TIME}`;
    }
  };

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      await exportConfig();
    } catch (error) {
      console.error("[Settings] Export failed:", error);
      alert(
        "Failed to export configuration. Please check the console for details.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      alert("Please select a valid configuration file (.zip format)");
      return;
    }

    try {
      await importConfig(file);
    } catch (error) {
      console.error("[Settings] Import failed:", error);
      alert(
        "Failed to import configuration. Please check the console for details.",
      );
    } finally {
      // 清空input，允许重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isUpdating = updateStatus !== "idle";

  return (
    <>
      <div className={`settings ${isVisible ? "visible" : "hidden"}`}>
        <div className="settings-theme" onClick={cycleTheme}>
          <button
            type="button"
            className="settings-theme-button"
            title={`Current theme: ${currentTheme.name}. Click to cycle theme.`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13.5" cy="6.5" r=".5" />
              <circle cx="17.5" cy="10.5" r=".5" />
              <circle cx="8.5" cy="7.5" r=".5" />
              <circle cx="6.5" cy="12.5" r=".5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </button>
          {currentTheme.name}
        </div>
        <div className="settings-config">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: "none" }}
            onChange={handleImportFileChange}
          />
          <button
            type="button"
            className="settings-config-button"
            onClick={handleImportClick}
            title="Load settings from a zip file"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            className={`settings-config-button ${isExporting ? "exporting" : ""}`}
            onClick={handleExport}
            title="Export all settings to a zip file"
            disabled={isExporting}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            className="settings-config-button"
            onClick={() => setIsAboutModalOpen(true)}
            title="About"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      {isAboutModalOpen && (
        <div
          className="settings-modal-mask"
          onClick={() => setIsAboutModalOpen(false)}
        >
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Drummer - Beat Maker</h2>
              <button
                type="button"
                className="settings-modal-close"
                onClick={() => setIsAboutModalOpen(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-modal-content">
              <p className="settings-modal-description">
                A powerful beat maker and drum practice tool with pattern
                editing, background music support, and customizable themes.
              </p>
              <div className="settings-modal-section">
                <h3>Features</h3>
                <ul>
                  <li>Create and edit custom drum patterns</li>
                  <li>Practice mode with adjustable tempo</li>
                  <li>Background music integration</li>
                  <li>Multiple instrument sounds</li>
                  <li>Configurable time signatures</li>
                  <li>Theme customization</li>
                  <li>Export/Import settings</li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>How to Use</h3>
                <ul>
                  <li>Click cells to toggle beats on/off</li>
                  <li>Use Play button to start/stop playback</li>
                  <li>Adjust BPM with + / - buttons</li>
                  <li>Click stopwatch icon for bar-specific tempo</li>
                  <li>Switch between Edit and Practice modes</li>
                  <li>Add background music from your library</li>
                </ul>
              </div>
            </div>
            <div
              key={`version-${updateStatus}`}
              className={`settings-modal-version ${isUpdating ? "updating" : ""}`}
              onClick={handleRefresh}
            >
              {getStatusText()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
