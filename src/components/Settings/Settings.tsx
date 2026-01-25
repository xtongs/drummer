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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentTheme, cycleTheme } = useTheme();

  useEffect(() => {
    const handleShowVersion = () => {
      setIsVisible(true);
    };

    window.addEventListener("show-version", handleShowVersion);

    return () => {
      window.removeEventListener("show-version", handleShowVersion);
    };
  }, []);

  const handleRefresh = async () => {
    console.log("[Refresh] === handleRefresh started ===");
    console.log("[Refresh] Current version:", VERSION, "Build time:", BUILD_TIME);
    console.log("[Refresh] Set status: checking");
    setUpdateStatus("checking");

    try {
      if (!("serviceWorker" in navigator)) {
        console.log("[Refresh] ❌ Browser doesn't support ServiceWorker, reloading page directly");
        window.location.reload();
        return;
      }
      console.log("[Refresh] ✓ Browser supports ServiceWorker");

      console.log("[Refresh] Getting ServiceWorker registration...");
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        console.log("[Refresh] ❌ No registration found, reloading page directly");
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
        console.log("[Refresh] 🔄 controllerchange event triggered! Reloading page...");
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
        console.log("[Refresh] ⏰ 10s timeout! Removing listener and reloading page");
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          reloadOnControllerChange,
        );
        window.location.reload();
      }, 10000); // 10秒超时

      // 监听updatefound事件来检测新的SW开始安装
      const handleUpdateFound = () => {
        console.log("[Refresh] 🎉 updatefound event triggered! New SW started installing");
        setUpdateStatus("downloading");
        const newWorker = registration.installing;
        if (!newWorker) {
          console.log("[Refresh] ❌ updatefound triggered but installing is null");
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
            console.log("[Refresh] New worker installation complete, set status: activating");
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
      console.log("[Refresh] Calling registration.update() to check for updates...");
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
        console.log("[Refresh] ⚡ Found waiting worker after update(), activating directly");
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
          console.log("[Refresh] 📌 Confirmed no update, set status: no-update");
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
          console.log("[Refresh] Found installing or waiting, continuing to wait");
        }
      }, 5000);

      // 清理
      registration.addEventListener(
        "updatefound",
        () => {
          console.log("[Refresh] updatefound triggered, clearing no-update detection timer");
          clearTimeout(checkNoUpdate);
        },
        { once: true },
      );
      console.log("[Refresh] === handleRefresh initialization complete, waiting for events ===");
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
      alert("Failed to export configuration. Please check the console for details.");
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
      alert("Failed to import configuration. Please check the console for details.");
    } finally {
      // 清空input，允许重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  const isUpdating = updateStatus !== "idle";

  return (
    <div className={`settings`}>
      <div
        className="settings-theme-button"
        onClick={cycleTheme}
        title="Click to cycle theme"
      >
        Theme: {currentTheme.name}
      </div>
      <div
        className={`settings-version-button ${isUpdating ? "updating" : ""}`}
        onClick={handleRefresh}
      >
        {getStatusText()}
      </div>
      <div className="settings-config">
        <div
          className="settings-config-button"
          onClick={handleImportClick}
          title="Load settings from a zip file"
        >
          Restore
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          style={{ display: "none" }}
          onChange={handleImportFileChange}
        />
        <div
          className={`settings-config-button ${isExporting ? "exporting" : ""}`}
          onClick={handleExport}
          title="Export all settings to a zip file"
        >
          Backup
        </div>
      </div>
    </div>
  );
}
