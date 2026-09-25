import React from "react";
import { FaEdit } from "react-icons/fa";

export function StraightEditableField({
  label,
  type = "text",
  value,
  displayValue,
  isEditing,
  tempValue,
  onTempChange,
  onStartEdit,
  onSave,
  onCancel,
  prefix,
  fieldError,
  inputProps,
}: {
  label: string;
  type?: "text" | "date";
  value: string;
  displayValue?: string;
  isEditing: boolean;
  tempValue: string;
  onTempChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  prefix?: React.ReactNode;
  fieldError?: string | null;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className="account-field-group">
      <label>{label}</label>
      <div className="field-row">
        {isEditing ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className={prefix ? "input-with-prefix" : ""}>
              {prefix && <span className="input-prefix-box">{prefix}</span>}
              <input
                type={type}
                value={tempValue}
                onChange={(e) => onTempChange(e.target.value)}
                autoFocus
                {...inputProps}
              />
            </div>
            {fieldError && <p className="field-inline-error">{fieldError}</p>}
            <div className="mini-btn-group">
              <button className="mini-save-btn" onClick={onSave}>Save</button>
              <button className="mini-cancel-btn" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <span className="field-value">{displayValue ?? value ?? "Not set"}</span>
            <button
              className="edit-icon-btn icon-tooltip"
              onClick={onStartEdit}
              data-tooltip={`Edit ${label}`}
              aria-label={`Edit ${label}`}
            >
              <FaEdit />
            </button>
          </>
        )}
      </div>
    </div>
  );
}