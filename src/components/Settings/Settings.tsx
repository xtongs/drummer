import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { VERSION, BUILD_TIME } from "../../version";
import { useTheme } from "../../hooks/useTheme";
import { exportConfig, importConfig } from "../../utils/configBackup";
import { playDrumSound, reloadSamples } from "../../utils/audioEngine";
import {
  loadSampleSelection,
  loadSettingsLanguagePreference,
  saveSettingsLanguagePreference,
  setSampleVariant,
} from "../../utils/storage";
import type { DrumType, SampleVariant } from "../../types";
import {
  getLocalizedDrumLabel,
  getResolvedLanguage,
  getSettingsGuideMap,
  getSettingsCopy,
  SETTINGS_LANGUAGE_OPTIONS,
  type SettingsGuideKey,
  type SettingsLanguageCode,
  type SettingsLanguagePreference,
} from "../../utils/settingsI18n";
import "./Settings.css";

type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "activating"
  | "no-update";

const RTL_SETTINGS_LANGUAGES = new Set<SettingsLanguageCode>(["ar"]);

export function Settings() {
  const [isVisible, setIsVisible] = useState(false);
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [isExporting, setIsExporting] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [sampleSelection, setSampleSelection] = useState<
    Partial<Record<DrumType, SampleVariant>>
  >({});
  const [languagePreference, setLanguagePreference] =
    useState<SettingsLanguagePreference>("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentTheme, cycleTheme } = useTheme();

  // 鼓件列表（从上到下）
  const drumTypes: DrumType[] = [
    "Crash 1",
    "Crash 2",
    "Hi-Hat Open",
    "Hi-Hat Closed",
    "Ride",
    "Tom 1",
    "Tom 2",
    "Snare",
    "Tom 3",
    "Kick",
  ];

  // 加载采样选择
  useEffect(() => {
    setSampleSelection(loadSampleSelection());
  }, []);

  // 加载语言偏好（默认跟随系统）
  useEffect(() => {
    setLanguagePreference(loadSettingsLanguagePreference());
  }, []);

  // 处理采样选择变更（预览并切换）
  const handleSampleChange = async (
    drumType: DrumType,
    variant: SampleVariant,
  ) => {
    // 先切换采样
    setSampleVariant(drumType, variant);
    setSampleSelection((prev) => ({ ...prev, [drumType]: variant }));

    // 重新加载采样
    await reloadSamples();

    // 加载完成后再预听（使用新采样）
    await playDrumSound(drumType);
  };

  // 重置超时定时器
  const resetTimeout = useCallback(() => {
    if (isAboutModalOpen) {
      // modal 打开时不启动自动隐藏
      return;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      // 检查是否是首次加载后的隐藏
      const hasShownFirstTime = localStorage.getItem("drummer-first-shown");
      if (!hasShownFirstTime) {
        setShowFirstTimeHint(true);
        localStorage.setItem("drummer-first-shown", "true");

        // 10秒后自动隐藏提示
        hintTimeoutRef.current = setTimeout(() => {
          setShowFirstTimeHint(false);
        }, 10000);
      }
    }, 10000); // 10秒后自动隐藏
  }, [isAboutModalOpen]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  // 首次加载检测
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem("drummer-visited");
    if (!hasVisitedBefore) {
      // 首次访问，显示 settings
      setIsVisible(true);
      localStorage.setItem("drummer-visited", "true");
    }
  }, []);

  useEffect(() => {
    const handleShowVersion = () => {
      setIsVisible(true);
      setShowFirstTimeHint(false);
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
  }, [isVisible, resetTimeout]);

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
        {
          once: true,
        },
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
        return currentCopy.statusChecking;
      case "downloading":
        return currentCopy.statusDownloading;
      case "installing":
        return currentCopy.statusInstalling;
      case "activating":
        return currentCopy.statusActivating;
      case "no-update":
        return currentCopy.statusLatestVersion;
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
  const resolvedLanguage = getResolvedLanguage(languagePreference);
  const isRtlLanguage = RTL_SETTINGS_LANGUAGES.has(resolvedLanguage);
  const currentCopy = getSettingsCopy(languagePreference);
  const guideMap = useMemo(
    () => getSettingsGuideMap(languagePreference),
    [languagePreference],
  );
  const tGuide = (key: SettingsGuideKey) => guideMap[key];

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextPreference = event.target.value as SettingsLanguagePreference;
    setLanguagePreference(nextPreference);
    saveSettingsLanguagePreference(nextPreference);
  };

  return (
    <>
      <div
        className={`settings-first-hint ${showFirstTimeHint ? "visible" : "hidden"}`}
      >
        {currentCopy.tapHintShowSettings}
      </div>
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
          <div
            className="settings-modal"
            dir={isRtlLanguage ? "rtl" : "ltr"}
            lang={resolvedLanguage}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-header">
              <h2>{currentCopy.modalTitle}</h2>
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
              <div className="settings-language-row">
                <label htmlFor="settings-language-select">
                  {currentCopy.languageLabel}
                </label>
                <select
                  id="settings-language-select"
                  className="settings-language-select"
                  value={languagePreference}
                  onChange={handleLanguageChange}
                  data-testid="settings-language-select"
                >
                  <option value="auto">{`${currentCopy.autoLabel}`}</option>
                  {SETTINGS_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <h3 className="settings-modal-subtitle">
                {currentCopy.introTitle}
              </h3>
              <p className="settings-modal-description">
                {currentCopy.introDescription}
              </p>
              <div className="settings-modal-section">
                <h3>{tGuide("sectionTopBarTitle")}</h3>
                <ul>
                  <li>
                    <strong>{tGuide("labelBeatDots")}</strong>:{" "}
                    {tGuide("tailBeatDots")}
                  </li>
                  <li>
                    <strong>{tGuide("labelTempo")}</strong>{" "}
                    <span className="settings-icon">
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
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>{" "}
                    /{" "}
                    <span className="settings-icon">
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
                    </span>
                    : {tGuide("tailTempo")}
                  </li>
                  <li>
                    <strong>{tGuide("labelBpmNumber")}</strong>:{" "}
                    {tGuide("tailBpmNumber")}
                  </li>
                  <li>
                    <strong>{tGuide("labelPlay")}</strong>{" "}
                    <span className="settings-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <polygon points="6 3 18 12 6 21" />
                      </svg>
                    </span>
                    : {tGuide("tailPlay")}
                  </li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{tGuide("sectionPatternsTitle")}</h3>
                <ul>
                  <li>
                    <strong>{tGuide("labelTabs")}</strong>: {tGuide("tailTabs")}
                  </li>
                  <li>
                    <strong>{tGuide("labelNewPattern")}</strong>{" "}
                    <span className="settings-icon">
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
                    </span>
                    : {tGuide("tailNewPattern")}
                  </li>
                  <li>
                    <strong>{tGuide("labelImportPattern")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M12 3v12" />
                        <polyline points="8 7 12 3 16 7" />
                        <path d="M4 21h16v0" />
                      </svg>
                    </span>
                    : {tGuide("tailImportPattern")}
                  </li>
                  <li>
                    <strong>{tGuide("labelBars")}</strong>{" "}
                    <span className="settings-icon">
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
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>{" "}
                    /{" "}
                    <span className="settings-icon">
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
                    </span>
                    : {tGuide("tailBars")}
                  </li>
                  <li>
                    <strong>{tGuide("labelLoopRange")}</strong>:{" "}
                    {tGuide("tailLoopRange")}
                  </li>
                  <li>
                    <strong>{tGuide("labelPerBarBpm")}</strong>{" "}
                    <span className="settings-icon">
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
                        <circle cx="12" cy="12" r="9" />
                        <line x1="12" y1="12" x2="16" y2="7" />
                        <circle cx="12" cy="12" r="1.5" />
                      </svg>
                    </span>
                    : {tGuide("tailPerBarBpm")}
                  </li>
                  <li>
                    <strong>{tGuide("labelCopyPaste")}</strong>{" "}
                    <span className="settings-icon">
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
                        <rect x="9" y="9" width="10" height="10" rx="2" />
                        <rect x="5" y="5" width="10" height="10" rx="2" />
                      </svg>
                    </span>{" "}
                    <span className="settings-icon">
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
                        <polyline points="12 5 5 12 12 19" />
                        <line x1="19" y1="12" x2="5" y2="12" />
                      </svg>
                    </span>{" "}
                    /{" "}
                    <span className="settings-icon">
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
                        <polyline points="12 5 19 12 12 19" />
                        <line x1="19" y1="12" x2="5" y2="12" />
                      </svg>
                    </span>
                    : {tGuide("tailCopyPaste")}
                  </li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{tGuide("sectionGridTitle")}</h3>
                <ul>
                  <li>
                    <strong>{tGuide("labelSingleClickTap")}</strong>:{" "}
                    {tGuide("tailSingleClickTap")}
                  </li>
                  <li>
                    <strong>{tGuide("labelDoubleClickTap")}</strong>:{" "}
                    {tGuide("tailDoubleClickTap")}
                  </li>
                  <li>
                    <strong>{tGuide("labelLongPressActiveCell")}</strong>:{" "}
                    {tGuide("tailLongPressActiveCell")}
                  </li>
                  <li>
                    <strong>{tGuide("labelNotationView")}</strong>:{" "}
                    {tGuide("tailNotationView")}
                  </li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{tGuide("sectionActionButtonsTitle")}</h3>
                <ul>
                  <li>
                    <strong>{tGuide("labelCountIn")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M6 20 L12 4 L18 20 Z" />
                        <line x1="12" y1="16" x2="16" y2="6" />
                      </svg>
                    </span>
                    : {tGuide("tailCountIn")}
                  </li>
                  <li>
                    <strong>{tGuide("labelPracticeMode")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </span>
                    : {tGuide("tailPracticeMode")}
                  </li>
                  <li>
                    <strong>{tGuide("labelPlayBottom")}</strong>{" "}
                    <span className="settings-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <polygon points="6 3 18 12 6 21" />
                      </svg>
                    </span>
                    : {tGuide("tailPlayBottom")}
                  </li>
                  <li>
                    <strong>{tGuide("labelSaveCurrent")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                    </span>
                    : {tGuide("tailSaveCurrent")}
                  </li>
                  <li>
                    <strong>{tGuide("labelDelete")}</strong>{" "}
                    <span className="settings-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </span>
                    : {tGuide("tailDelete")}
                  </li>
                  <li>
                    <strong>{tGuide("labelClear")}</strong>{" "}
                    <span className="settings-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                    : {tGuide("tailClear")}
                  </li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{tGuide("sectionBgmTitle")}</h3>
                <ul>
                  <li>
                    <strong>{tGuide("labelUpload")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M12 3v12" />
                        <polyline points="8 7 12 3 16 7" />
                        <path d="M4 21h16v0" />
                      </svg>
                    </span>
                    : {tGuide("tailUploadBeforeDelete")}{" "}
                    <span className="settings-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </span>{" "}
                    {tGuide("tailUploadAfterDelete")}
                  </li>
                  <li>
                    <strong>{tGuide("labelVolume")}</strong>{" "}
                    <span className="settings-icon">
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
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>{" "}
                    /{" "}
                    <span className="settings-icon">
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
                    </span>
                    : {tGuide("tailVolume")}
                  </li>
                  <li>
                    <strong>{tGuide("labelOffset")}</strong>:{" "}
                    {tGuide("tailOffset")}
                  </li>
                  <li>
                    <strong>{tGuide("labelPatternVolume")}</strong>:{" "}
                    {tGuide("tailPatternVolume")}
                  </li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{tGuide("sectionSettingsTitle")}</h3>
                <ul>
                  <li>
                    <strong>{tGuide("labelTheme")}</strong>{" "}
                    <span className="settings-icon">
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
                        <circle cx="13.5" cy="6.5" r=".5" />
                        <circle cx="17.5" cy="10.5" r=".5" />
                        <circle cx="8.5" cy="7.5" r=".5" />
                        <circle cx="6.5" cy="12.5" r=".5" />
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                      </svg>
                    </span>
                    : {tGuide("tailTheme")}
                  </li>
                  <li>
                    <strong>{tGuide("labelBackupRestore")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>{" "}
                    /{" "}
                    <span className="settings-icon">
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </span>
                    : {tGuide("tailBackupRestore")}
                  </li>
                  <li>
                    <strong>{tGuide("labelSettings")}</strong>{" "}
                    <span className="settings-icon">
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
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                    : {tGuide("tailSettings")}
                  </li>
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{currentCopy.privacyTitle}</h3>
                <ul>
                  {currentCopy.privacyItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{currentCopy.termsTitle}</h3>
                <ul>
                  {currentCopy.termsItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="settings-modal-section">
                <h3>{currentCopy.sampleSelectionTitle}</h3>
                <p className="settings-modal-description">
                  {currentCopy.sampleSelectionDescription}
                </p>
                <div className="sample-selection-list">
                  {drumTypes.map((drumType) => {
                    const currentVariant = sampleSelection[drumType] || "A";
                    const localizedDrumLabel = getLocalizedDrumLabel(
                      drumType,
                      languagePreference,
                    );
                    return (
                      <div key={drumType} className="sample-selection-item">
                        <div className="sample-selection-drum">
                          {localizedDrumLabel}
                        </div>
                        <div className="sample-selection-variants">
                          {(["A", "B", "C"] as SampleVariant[]).map(
                            (variant) => (
                              <button
                                key={variant}
                                type="button"
                                className={`sample-variant-button ${
                                  currentVariant === variant ? "active" : ""
                                }`}
                                onClick={() =>
                                  handleSampleChange(drumType, variant)
                                }
                                title={`Select ${variant} variant for ${localizedDrumLabel}`}
                              >
                                {variant}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
