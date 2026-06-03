import React, { useState } from "react";
import { Check, ChevronDown, Copy, AlertCircle } from "lucide-react";

/**
 * A2UI-inspired interactive message component for agent responses.
 * Supports rich interactive elements: checkboxes, buttons, inputs, and rich responses.
 */

interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
}

interface ButtonOption {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: React.ReactNode;
}

interface InputField {
  id: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "number" | "email";
  required?: boolean;
}

interface A2UIMessageProps {
  type: "text" | "checkboxes" | "buttons" | "input" | "rich-response";
  content?: string;
  checkboxes?: CheckboxOption[];
  buttons?: ButtonOption[];
  inputFields?: InputField[];
  onCheckboxChange?: (id: string, checked: boolean) => void;
  onButtonClick?: (id: string) => void;
  onInputSubmit?: (data: Record<string, string | number>) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
}

export function A2UICheckboxGroup({
  title,
  description,
  checkboxes,
  onCheckboxChange,
}: {
  title?: string;
  description?: string;
  checkboxes: CheckboxOption[];
  onCheckboxChange?: (id: string, checked: boolean) => void;
}) {
  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-50 p-4 dark:bg-base-900/20">
      {title && <h4 className="mb-2 font-semibold text-base-content">{title}</h4>}
      {description && (
        <p className="mb-3 text-sm text-base-content/70">{description}</p>
      )}
      <div className="space-y-2">
        {checkboxes.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-base-200/50 dark:hover:bg-base-800/30"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-1"
              checked={option.checked ?? false}
              onChange={(e) => onCheckboxChange?.(option.id, e.target.checked)}
            />
            <div className="flex-1">
              <div className="font-medium text-base-content">{option.label}</div>
              {option.description && (
                <div className="text-xs text-base-content/60">
                  {option.description}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export function A2UIButtonGroup({
  title,
  description,
  buttons,
  onButtonClick,
  isLoading,
}: {
  title?: string;
  description?: string;
  buttons: ButtonOption[];
  onButtonClick?: (id: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-50 p-4 dark:bg-base-900/20">
      {title && <h4 className="mb-2 font-semibold text-base-content">{title}</h4>}
      {description && (
        <p className="mb-3 text-sm text-base-content/70">{description}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => onButtonClick?.(btn.id)}
            disabled={isLoading}
            className={`btn btn-sm gap-2 ${
              btn.variant === "danger"
                ? "btn-error"
                : btn.variant === "secondary"
                  ? "btn-ghost"
                  : "btn-primary"
            }`}
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function A2UIInputForm({
  title,
  description,
  inputFields,
  onInputSubmit,
  isLoading,
}: {
  title?: string;
  description?: string;
  inputFields: InputField[];
  onInputSubmit?: (data: Record<string, string | number>) => void;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, string | number>>(
    Object.fromEntries(inputFields.map((f) => [f.id, ""]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInputSubmit?.(formData);
  };

  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-50 p-4 dark:bg-base-900/20">
      {title && <h4 className="mb-2 font-semibold text-base-content">{title}</h4>}
      {description && (
        <p className="mb-3 text-sm text-base-content/70">{description}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        {inputFields.map((field) => (
          <div key={field.id}>
            <label className="label">
              <span className="label-text text-sm font-medium">
                {field.label}
                {field.required && <span className="text-error">*</span>}
              </span>
            </label>
            {field.type === "textarea" ? (
              <textarea
                placeholder={field.placeholder}
                className="textarea textarea-bordered textarea-sm w-full"
                value={formData[field.id] ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                required={field.required}
              />
            ) : (
              <input
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                className="input input-bordered input-sm w-full"
                value={formData[field.id] ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                required={field.required}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-sm w-full"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
          Submit
        </button>
      </form>
    </div>
  );
}

export function A2UIRichResponse({
  title,
  content,
  status,
  error,
}: {
  title?: string;
  content?: string;
  status?: "success" | "error" | "info" | "warning";
  error?: string;
}) {
  const statusClasses = {
    success: "alert-success",
    error: "alert-error",
    info: "alert-info",
    warning: "alert-warning",
  };

  const statusIcons = {
    success: <Check className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
  };

  return (
    <div
      className={`alert ${status ? statusClasses[status] : "alert-info"} my-3`}
    >
      {status && statusIcons[status]}
      <div>
        {title && <h4 className="font-semibold">{title}</h4>}
        {content && <p className="text-sm">{content}</p>}
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}

export function A2UIMessage({
  type,
  content,
  checkboxes,
  buttons,
  inputFields,
  onCheckboxChange,
  onButtonClick,
  onInputSubmit,
  title,
  description,
  isLoading,
  error,
}: A2UIMessageProps) {
  if (error) {
    return (
      <A2UIRichResponse
        title={title || "Error"}
        content={error}
        status="error"
      />
    );
  }

  switch (type) {
    case "checkboxes":
      return (
        <A2UICheckboxGroup
          title={title}
          description={description}
          checkboxes={checkboxes || []}
          onCheckboxChange={onCheckboxChange}
        />
      );

    case "buttons":
      return (
        <A2UIButtonGroup
          title={title}
          description={description}
          buttons={buttons || []}
          onButtonClick={onButtonClick}
          isLoading={isLoading}
        />
      );

    case "input":
      return (
        <A2UIInputForm
          title={title}
          description={description}
          inputFields={inputFields || []}
          onInputSubmit={onInputSubmit}
          isLoading={isLoading}
        />
      );

    case "rich-response":
      return (
        <A2UIRichResponse
          title={title}
          content={content}
          status="success"
        />
      );

    case "text":
    default:
      return (
        <div className="my-2 rounded-lg bg-base-100 p-3 text-base-content">
          {content}
        </div>
      );
  }
}

export default A2UIMessage;
