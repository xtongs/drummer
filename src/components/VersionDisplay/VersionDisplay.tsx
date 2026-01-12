import { useEffect, useState } from "react";
import { VERSION, BUILD_TIME } from "../../version";
import "./VersionDisplay.css";

type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "activating"
  | "no-update";

export function VersionDisplay() {
  const [isVisible, setIsVisible] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");

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
    setUpdateStatus("checking");

    try {
      if (!("serviceWorker" in navigator)) {
        window.location.reload();
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        window.location.reload();
        return;
      }

      // 监听控制器变更 - 这是SW真正接管页面的信号
      const reloadOnControllerChange = () => {
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        reloadOnControllerChange,
        { once: true }
      );

      // 如果已经有等待中的worker，直接激活它
      if (registration.waiting) {
        setUpdateStatus("activating");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // 设置超时，避免iOS上无限等待
      const timeoutId = setTimeout(() => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          reloadOnControllerChange
        );
        window.location.reload();
      }, 10000); // 10秒超时

      // 监听updatefound事件来检测新的SW开始安装
      const handleUpdateFound = () => {
        setUpdateStatus("downloading");
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installing") {
            setUpdateStatus("installing");
          }
          // 当新SW安装完成（进入waiting状态），通知它跳过等待
          if (newWorker.state === "installed") {
            setUpdateStatus("activating");
            clearTimeout(timeoutId);
            // newWorker 现在就是 waiting 状态的 worker
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      };

      registration.addEventListener("updatefound", handleUpdateFound, {
        once: true,
      });

      // 触发更新检查
      try {
        await registration.update();
      } catch (updateError) {
        console.warn("Update check failed:", updateError);
      }

      // 如果update()后立即有waiting的worker（可能已经下载好了）
      // 使用类型断言绕过TS控制流分析（await后属性可能改变）
      const waitingAfterUpdate = registration.waiting as ServiceWorker | null;
      if (waitingAfterUpdate) {
        setUpdateStatus("activating");
        clearTimeout(timeoutId);
        waitingAfterUpdate.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // 如果没有新的SW（没有更新），超时后会自动刷新
      // 或者可以在这里检查是否真的没有更新
      const checkNoUpdate = setTimeout(() => {
        // 如果5秒内没有触发updatefound，说明可能没有新版本
        if (!registration.installing && !registration.waiting) {
          setUpdateStatus("no-update");
          clearTimeout(timeoutId);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            reloadOnControllerChange
          );
          // 1秒后刷新，让用户看到"已是最新"
          setTimeout(() => window.location.reload(), 1000);
        }
      }, 5000);

      // 清理
      registration.addEventListener(
        "updatefound",
        () => clearTimeout(checkNoUpdate),
        { once: true }
      );
    } catch (error) {
      console.error("Failed to check for updates:", error);
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
        return `v${VERSION} (${BUILD_TIME})`;
    }
  };

  if (!isVisible) {
    return null;
  }

  const isUpdating = updateStatus !== "idle";

  return (
    <div
      className={`version-display ${isUpdating ? "updating" : ""}`}
      onClick={handleRefresh}
    >
      {getStatusText()}
    </div>
  );
}
