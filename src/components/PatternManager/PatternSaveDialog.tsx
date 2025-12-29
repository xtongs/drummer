import { useState } from "react";
import "./PatternSaveDialog.css";

interface PatternSaveDialogProps {
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function PatternSaveDialog({
  defaultName,
  onSave,
  onCancel,
}: PatternSaveDialogProps) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Save Pattern</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="dialog-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pattern name"
            autoFocus
          />
          <div className="dialog-buttons">
            <button type="button" className="dialog-button cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="dialog-button save" disabled={!name.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

