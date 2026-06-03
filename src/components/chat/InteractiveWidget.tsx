import { CheckCircle2, ChevronDown, ChevronUp, Copy, Zap } from "lucide-react";
import { useState, useCallback } from "react";

/**
 * Interactive widget component for enhanced chat UI.
 * Provides checkboxes, input buttons, rich responses, and better visual feedback.
 */

export interface InteractiveWidgetProps {
  type: "checkbox-group" | "button-group" | "input-field" | "code-block" | "rich-response";
  title?: string;
  description?: string;
  items?: Array<{
    id: string;
    label: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
  }>;
  onSelectionChange?: (selectedIds: string[]) => void;
  onButtonClick?: (buttonId: string) => void;
  onInputSubmit?: (value: string) => void;
  code?: string;
  language?: string;
  expanded?: boolean;
  className?: string;
}

/**
 * Checkbox group widget for multi-select interactions
 */
export function CheckboxGroup({
  title,
  description,
  items = [],
  onSelectionChange,
}: InteractiveWidgetProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(items.filter((i) => i.checked).map((i) => i.id))
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-100 p-4">
      {title && <h3 className="mb-2 font-semibold text-base-content">{title}</h3>}
      {description && <p className="mb-3 text-sm text-base-content/70">{description}</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-base-200"
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => handleToggle(item.id)}
              disabled={item.disabled}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">{item.label}</span>
            {item.value && <span className="ml-auto text-xs text-base-content/50">{item.value}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Button group widget for action selection
 */
export function ButtonGroup({
  title,
  description,
  items = [],
  onButtonClick,
}: InteractiveWidgetProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleClick = async (id: string) => {
    setLoading(id);
    try {
      onButtonClick?.(id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-100 p-4">
      {title && <h3 className="mb-2 font-semibold text-base-content">{title}</h3>}
      {description && <p className="mb-3 text-sm text-base-content/70">{description}</p>}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            disabled={item.disabled || loading !== null}
            className="btn btn-sm btn-outline gap-2"
          >
            {loading === item.id && <span className="loading loading-spinner loading-xs" />}
            <Zap size={14} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Input field widget for user input with submission
 */
export function InputField({
  title,
  description,
  onInputSubmit,
}: InteractiveWidgetProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (value.trim()) {
      onInputSubmit?.(value);
      setSubmitted(true);
      setValue("");
      setTimeout(() => setSubmitted(false), 2000);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-100 p-4">
      {title && <h3 className="mb-2 font-semibold text-base-content">{title}</h3>}
      {description && <p className="mb-3 text-sm text-base-content/70">{description}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Enter value..."
          className="input input-sm input-bordered flex-1"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="btn btn-sm btn-primary gap-2"
        >
          {submitted ? <CheckCircle2 size={14} /> : <span>Send</span>}
        </button>
      </div>
    </div>
  );
}

/**
 * Code block widget with copy and expand functionality
 */
export function CodeBlock({
  code = "",
  language = "typescript",
  title,
  expanded: initialExpanded = false,
}: InteractiveWidgetProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");
  const displayLines = expanded ? lines : lines.slice(0, 5);
  const hasMore = lines.length > 5;

  return (
    <div className="my-3 rounded-lg border border-base-300 bg-base-900 p-4">
      {title && <h3 className="mb-2 font-mono text-sm font-semibold text-base-content">{title}</h3>}
      <div className="relative">
        <pre className="overflow-x-auto rounded bg-base-800 p-3 text-xs text-base-content">
          <code className={`language-${language}`}>
            {displayLines.join("\n")}
            {!expanded && hasMore && "\n..."}
          </code>
        </pre>
        <div className="absolute right-2 top-2 flex gap-1">
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn btn-xs btn-ghost gap-1"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="btn btn-xs btn-ghost gap-1"
            title="Copy to clipboard"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Rich response widget for structured information display
 */
export function RichResponse({
  title,
  description,
  items = [],
  className,
}: InteractiveWidgetProps) {
  return (
    <div className={`my-3 rounded-lg border border-success/30 bg-success/5 p-4 ${className || ""}`}>
      {title && <h3 className="mb-2 flex items-center gap-2 font-semibold text-success">
        <CheckCircle2 size={16} />
        {title}
      </h3>}
      {description && <p className="mb-3 text-sm text-base-content/70">{description}</p>}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Main interactive widget renderer
 */
export default function InteractiveWidget(props: InteractiveWidgetProps) {
  switch (props.type) {
    case "checkbox-group":
      return <CheckboxGroup {...props} />;
    case "button-group":
      return <ButtonGroup {...props} />;
    case "input-field":
      return <InputField {...props} />;
    case "code-block":
      return <CodeBlock {...props} />;
    case "rich-response":
      return <RichResponse {...props} />;
    default:
      return null;
  }
}
