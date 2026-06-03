import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { A2UIMessage } from "./A2UIMessage";

/**
 * Detects and renders A2UI interactive widgets embedded in markdown.
 * Supports syntax like:
 *
 * :::a2ui:checkbox
 * title: "Choose Options"
 * description: "Select the ones you prefer"
 * options:
 *   - id: opt1, label: "Option 1", description: "First option"
 *   - id: opt2, label: "Option 2"
 * :::
 *
 * :::a2ui:button
 * title: "Actions"
 * buttons:
 *   - id: btn1, label: "Approve", variant: "primary"
 *   - id: btn2, label: "Reject", variant: "danger"
 * :::
 */

interface A2UIWidget {
  type: "checkbox" | "button" | "input" | "rich-response";
  title?: string;
  description?: string;
  options?: Array<{ id: string; label: string; description?: string }>;
  buttons?: Array<{ id: string; label: string; variant?: string }>;
  fields?: Array<{ id: string; label: string; placeholder?: string; type?: string; required?: boolean }>;
  status?: "success" | "error" | "info" | "warning";
  content?: string;
}

function parseA2UIWidget(markdown: string): A2UIWidget | null {
  const a2uiMatch = markdown.match(
    /:::a2ui:(\w+)\n([\s\S]*?)\n:::/
  );
  if (!a2uiMatch) return null;

  const type = a2uiMatch[1] as "checkbox" | "button" | "input" | "rich-response";
  const content = a2uiMatch[2];

  const widget: A2UIWidget = { type };

  // Parse YAML-like format
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("title:")) {
      widget.title = trimmed.replace(/title:\s*["']?([^"']*?)["']?$/, "$1");
    } else if (trimmed.startsWith("description:")) {
      widget.description = trimmed.replace(/description:\s*["']?([^"']*?)["']?$/, "$1");
    } else if (trimmed.startsWith("status:")) {
      widget.status = trimmed.replace(/status:\s*["']?([^"']*?)["']?$/, "$1") as any;
    } else if (trimmed.startsWith("content:")) {
      widget.content = trimmed.replace(/content:\s*["']?([^"']*?)["']?$/, "$1");
    }
  }

  // Parse options/buttons/fields arrays
  const optionsMatch = content.match(/options:\s*\n((?:\s+-.*\n?)*)/);
  if (optionsMatch) {
    widget.options = [];
    const optLines = optionsMatch[1].split("\n").filter((l) => l.trim().startsWith("-"));
    for (const optLine of optLines) {
      const opt: any = {};
      const idMatch = optLine.match(/id:\s*["']?([^,\n"']*)/);
      const labelMatch = optLine.match(/label:\s*["']([^"']*)/);
      const descMatch = optLine.match(/description:\s*["']([^"']*)/);
      if (idMatch) opt.id = idMatch[1].trim();
      if (labelMatch) opt.label = labelMatch[1];
      if (descMatch) opt.description = descMatch[1];
      if (opt.id && opt.label) widget.options.push(opt);
    }
  }

  const buttonsMatch = content.match(/buttons:\s*\n((?:\s+-.*\n?)*)/);
  if (buttonsMatch) {
    widget.buttons = [];
    const btnLines = buttonsMatch[1].split("\n").filter((l) => l.trim().startsWith("-"));
    for (const btnLine of btnLines) {
      const btn: any = {};
      const idMatch = btnLine.match(/id:\s*["']?([^,\n"']*)/);
      const labelMatch = btnLine.match(/label:\s*["']([^"']*)/);
      const variantMatch = btnLine.match(/variant:\s*["']?([^,\n"']*)/);
      if (idMatch) btn.id = idMatch[1].trim();
      if (labelMatch) btn.label = labelMatch[1];
      if (variantMatch) btn.variant = variantMatch[1].trim();
      if (btn.id && btn.label) widget.buttons.push(btn);
    }
  }

  const fieldsMatch = content.match(/fields:\s*\n((?:\s+-.*\n?)*)/);
  if (fieldsMatch) {
    widget.fields = [];
    const fldLines = fieldsMatch[1].split("\n").filter((l) => l.trim().startsWith("-"));
    for (const fldLine of fldLines) {
      const fld: any = {};
      const idMatch = fldLine.match(/id:\s*["']?([^,\n"']*)/);
      const labelMatch = fldLine.match(/label:\s*["']([^"']*)/);
      const placeholderMatch = fldLine.match(/placeholder:\s*["']([^"']*)/);
      const typeMatch = fldLine.match(/type:\s*["']?([^,\n"']*)/);
      const requiredMatch = fldLine.match(/required:\s*(true|false)/);
      if (idMatch) fld.id = idMatch[1].trim();
      if (labelMatch) fld.label = labelMatch[1];
      if (placeholderMatch) fld.placeholder = placeholderMatch[1];
      if (typeMatch) fld.type = typeMatch[1].trim();
      if (requiredMatch) fld.required = requiredMatch[1] === "true";
      if (fld.id && fld.label) widget.fields.push(fld);
    }
  }

  return widget;
}

export function A2UIMessageRenderer({
  content,
  onWidgetAction,
}: {
  content: string;
  onWidgetAction?: (widgetType: string, action: string, data?: any) => void;
}) {
  const widget = useMemo(() => parseA2UIWidget(content), [content]);

  if (widget) {
    const handleCheckboxChange = (id: string, checked: boolean) => {
      onWidgetAction?.("checkbox", "change", { id, checked });
    };

    const handleButtonClick = (id: string) => {
      onWidgetAction?.("button", "click", { id });
    };

    const handleInputSubmit = (data: Record<string, string | number>) => {
      onWidgetAction?.("input", "submit", data);
    };

    return (
      <A2UIMessage
        type={
          widget.type === "checkbox"
            ? "checkboxes"
            : widget.type === "button"
              ? "buttons"
              : widget.type === "input"
                ? "input"
                : "rich-response"
        }
        title={widget.title}
        description={widget.description}
        checkboxes={
          widget.options?.map((opt) => ({
            id: opt.id,
            label: opt.label,
            description: opt.description,
          })) || []
        }
        buttons={
          widget.buttons?.map((btn) => ({
            id: btn.id,
            label: btn.label,
            variant: (btn.variant as "primary" | "secondary" | "danger") || "primary",
          })) || []
        }
        inputFields={
          widget.fields?.map((fld) => ({
            id: fld.id,
            label: fld.label,
            placeholder: fld.placeholder,
            type: (fld.type as "text" | "textarea" | "number" | "email") || "text",
            required: fld.required,
          })) || []
        }
        onCheckboxChange={handleCheckboxChange}
        onButtonClick={handleButtonClick}
        onInputSubmit={handleInputSubmit}
        content={widget.content}
      />
    );
  }

  // Fallback to standard markdown rendering
  return (
    <div className="prose prose-sm max-w-none break-words text-base-content dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default A2UIMessageRenderer;
