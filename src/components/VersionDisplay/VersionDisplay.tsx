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
    console.log("[Refresh] === handleRefresh 开始 ===");
    console.log("[Refresh] 当前版本:", VERSION, "构建时间:", BUILD_TIME);
    console.log("[Refresh] 设置状态: checking");
    setUpdateStatus("checking");

    try {
      if (!("serviceWorker" in navigator)) {
        console.log("[Refresh] ❌ 浏览器不支持 ServiceWorker，直接刷新页面");
        window.location.reload();
        return;
      }
      console.log("[Refresh] ✓ 浏览器支持 ServiceWorker");

      console.log("[Refresh] 获取 ServiceWorker registration...");
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        console.log("[Refresh] ❌ 没有找到 registration，直接刷新页面");
        window.location.reload();
        return;
      }
      console.log("[Refresh] ✓ 获取到 registration:", {
        scope: registration.scope,
        active: registration.active?.state,
        waiting: registration.waiting?.state,
        installing: registration.installing?.state,
      });

      // 监听控制器变更 - 这是SW真正接管页面的信号
      const reloadOnControllerChange = () => {
        console.log("[Refresh] 🔄 controllerchange 事件触发！即将刷新页面...");
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        reloadOnControllerChange,
        { once: true }
      );
      console.log("[Refresh] ✓ 已添加 controllerchange 监听器");

      // 如果已经有等待中的worker，直接激活它
      if (registration.waiting) {
        console.log("[Refresh] ⚡ 发现已有 waiting 的 worker，直接激活");
        console.log(
          "[Refresh] waiting worker state:",
          registration.waiting.state
        );
        setUpdateStatus("activating");
        console.log("[Refresh] 发送 SKIP_WAITING 消息给 waiting worker");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }
      console.log("[Refresh] 当前没有 waiting 的 worker");

      // 设置超时，避免iOS上无限等待
      console.log("[Refresh] 设置 10 秒超时定时器");
      const timeoutId = setTimeout(() => {
        console.log("[Refresh] ⏰ 10秒超时！移除监听器并刷新页面");
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          reloadOnControllerChange
        );
        window.location.reload();
      }, 10000); // 10秒超时

      // 监听updatefound事件来检测新的SW开始安装
      const handleUpdateFound = () => {
        console.log("[Refresh] 🎉 updatefound 事件触发！新 SW 开始安装");
        setUpdateStatus("downloading");
        const newWorker = registration.installing;
        if (!newWorker) {
          console.log("[Refresh] ❌ updatefound 触发但 installing 为 null");
          return;
        }
        console.log("[Refresh] 新 worker 初始状态:", newWorker.state);

        newWorker.addEventListener("statechange", () => {
          console.log("[Refresh] 新 worker 状态变更:", newWorker.state);
          if (newWorker.state === "installing") {
            console.log("[Refresh] 设置状态: installing");
            setUpdateStatus("installing");
          }
          // 当新SW安装完成（进入waiting状态），通知它跳过等待
          if (newWorker.state === "installed") {
            console.log("[Refresh] 新 worker 安装完成，设置状态: activating");
            setUpdateStatus("activating");
            clearTimeout(timeoutId);
            console.log("[Refresh] 已清除超时定时器");
            // newWorker 现在就是 waiting 状态的 worker
            console.log("[Refresh] 发送 SKIP_WAITING 消息给新 worker");
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      };

      registration.addEventListener("updatefound", handleUpdateFound, {
        once: true,
      });
      console.log("[Refresh] ✓ 已添加 updatefound 监听器");

      // 触发更新检查
      console.log("[Refresh] 调用 registration.update() 检查更新...");
      try {
        await registration.update();
        console.log("[Refresh] ✓ registration.update() 完成");
      } catch (updateError) {
        console.warn("[Refresh] ⚠️ Update check failed:", updateError);
      }

      // 如果update()后立即有waiting的worker（可能已经下载好了）
      // 使用类型断言绕过TS控制流分析（await后属性可能改变）
      const waitingAfterUpdate = registration.waiting as ServiceWorker | null;
      console.log(
        "[Refresh] update() 后检查 waiting:",
        waitingAfterUpdate?.state || "null"
      );
      if (waitingAfterUpdate) {
        console.log("[Refresh] ⚡ update() 后发现 waiting worker，直接激活");
        setUpdateStatus("activating");
        clearTimeout(timeoutId);
        console.log("[Refresh] 发送 SKIP_WAITING 消息");
        waitingAfterUpdate.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // 如果没有新的SW（没有更新），超时后会自动刷新
      // 或者可以在这里检查是否真的没有更新
      console.log("[Refresh] 设置 5 秒无更新检测定时器");
      const checkNoUpdate = setTimeout(() => {
        console.log("[Refresh] ⏰ 5秒检测：检查是否有更新...");
        console.log(
          "[Refresh] installing:",
          registration.installing?.state || "null"
        );
        console.log(
          "[Refresh] waiting:",
          registration.waiting?.state || "null"
        );
        // 如果5秒内没有触发updatefound，说明可能没有新版本
        if (!registration.installing && !registration.waiting) {
          console.log("[Refresh] 📌 确认无更新，设置状态: no-update");
          setUpdateStatus("no-update");
          clearTimeout(timeoutId);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            reloadOnControllerChange
          );
          // 1秒后刷新，让用户看到"已是最新"
          console.log("[Refresh] 1秒后刷新页面...");
          setTimeout(() => {
            console.log("[Refresh] 🔄 执行刷新页面");
            window.location.reload();
          }, 1000);
        } else {
          console.log("[Refresh] 发现有 installing 或 waiting，继续等待");
        }
      }, 5000);

      // 清理
      registration.addEventListener(
        "updatefound",
        () => {
          console.log("[Refresh] updatefound 触发，清除无更新检测定时器");
          clearTimeout(checkNoUpdate);
        },
        { once: true }
      );
      console.log("[Refresh] === handleRefresh 初始化完成，等待事件 ===");
    } catch (error) {
      console.error("[Refresh] ❌ 异常:", error);
      console.log("[Refresh] 由于异常，执行刷新页面");
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
