import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import InteractiveWidget, { type InteractiveWidgetProps } from "./InteractiveWidget";

/**
 * Enhanced markdown renderer that supports interactive widgets.
 * Parses special markdown syntax for checkboxes, buttons, code blocks, etc.
 */

interface EnhancedMessageRendererProps {
  content: string;
  onWidgetInteraction?: (widgetType: string, data: any) => void;
}

/**
 * Parse widget syntax from markdown:
 * 
 * Checkbox group:
 * ```widget:checkbox
 * title: Select Options
 * description: Choose what applies
 * - option1: First option
 * - option2: Second option
 * ```
 * 
 * Button group:
 * ```widget:button
 * title: Actions
 * - create: Create New Agent
 * - archive: Archive Agent
 * ```
 * 
 * Input field:
 * ```widget:input
 * title: Enter Agent Name
 * description: Provide a unique identifier
 * ```
 * 
 * Code block with expand:
 * ```widget:code:typescript
 * title: System Prompt
 * [code content]
 * ```
 * 
 * Rich response:
 * ```widget:response
 * title: Success!
 * - Completed task 1
 * - Completed task 2
 * ```
 */

function parseWidgetBlock(content: string): { widgets: InteractiveWidgetProps[]; markdown: string } {
  const widgets: InteractiveWidgetProps[] = [];
  let markdown = content;

  // Match widget code blocks
  const widgetRegex = /```widget:(\w+)(?::(\w+))?\n([\s\S]*?)```/g;
  let match;

  while ((match = widgetRegex.exec(content)) !== null) {
    const widgetType = match[1];
    const language = match[2];
    const blockContent = match[3];

    const widget = parseWidgetContent(widgetType, language, blockContent);
    if (widget) {
      widgets.push(widget);
    }

    // Remove from markdown
    markdown = markdown.replace(match[0], "");
  }

  return { widgets, markdown };
}

function parseWidgetContent(
  type: string,
  language: string | undefined,
  content: string
): InteractiveWidgetProps | null {
  const lines = content.trim().split("\n");
  const metadata: Record<string, string> = {};
  let dataStartIdx = 0;

  // Parse metadata (key: value)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(":") && !lines[i].startsWith("-")) {
      const [key, ...valueParts] = lines[i].split(":");
      metadata[key.trim()] = valueParts.join(":").trim();
      dataStartIdx = i + 1;
    } else {
      break;
    }
  }

  const dataLines = lines.slice(dataStartIdx);
  const items = dataLines
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => {
      const match = line.match(/^-\s*(\w+):\s*(.+)$/);
      if (match) {
        return { id: match[1], label: match[2], value: match[2] };
      }
      return null;
    })
    .filter((item) => item !== null) as Array<{ id: string; label: string; value: string }>;

  const baseProps = {
    title: metadata.title,
    description: metadata.description,
  };

  switch (type) {
    case "checkbox":
      return {
        ...baseProps,
        type: "checkbox-group" as const,
        items,
      };
    case "button":
      return {
        ...baseProps,
        type: "button-group" as const,
        items,
      };
    case "input":
      return {
        ...baseProps,
        type: "input-field" as const,
      };
    case "code":
      return {
        ...baseProps,
        type: "code-block" as const,
        code: dataLines.join("\n"),
        language: language || "typescript",
      };
    case "response":
      return {
        ...baseProps,
        type: "rich-response" as const,
        items,
      };
    default:
      return null;
  }
}

export const EnhancedMessageRenderer = memo(function EnhancedMessageRenderer({
  content,
  onWidgetInteraction,
}: EnhancedMessageRendererProps) {
  const { widgets, markdown } = parseWidgetBlock(content);

  return (
    <div className="space-y-3">
      {/* Render markdown content */}
      {markdown.trim() && (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      )}

      {/* Render interactive widgets */}
      {widgets.map((widget, idx) => (
        <InteractiveWidget
          key={idx}
          {...widget}
          onSelectionChange={(selectedIds) => {
            onWidgetInteraction?.("checkbox-selection", {
              widgetTitle: widget.title,
              selectedIds,
            });
          }}
          onButtonClick={(buttonId) => {
            onWidgetInteraction?.("button-click", {
              widgetTitle: widget.title,
              buttonId,
            });
          }}
          onInputSubmit={(value) => {
            onWidgetInteraction?.("input-submit", {
              widgetTitle: widget.title,
              value,
            });
          }}
        />
      ))}
    </div>
  );
});

export default EnhancedMessageRenderer;
