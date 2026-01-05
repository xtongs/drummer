import { useEffect, useState } from "react";
import { VERSION, BUILD_TIME } from "../../version";
import "./VersionDisplay.css";

export function VersionDisplay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleShowVersion = () => {
      setIsVisible(true);
    };

    window.addEventListener("show-version", handleShowVersion);

    return () => {
      window.removeEventListener("show-version", handleShowVersion);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="version-display">
      v{VERSION} ({BUILD_TIME})
    </div>
  );
}
