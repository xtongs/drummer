import { useEffect, useState } from "react";
import { VERSION, BUILD_TIME } from "../../version";
import "./VersionDisplay.css";

export function VersionDisplay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    if (isLoading) return;

    setIsLoading(true);

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      }
      window.location.reload();
    } catch (error) {
      console.error("Failed to refresh:", error);
      window.location.reload();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="version-display" onClick={handleRefresh}>
      {`v${VERSION} (${BUILD_TIME})`}
    </div>
  );
}
