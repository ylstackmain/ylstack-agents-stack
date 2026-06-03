# A2UI Integration Guide

This document describes the A2UI-inspired interactive message system integrated into the YLStack chat interface.

## Overview

The A2UI message system enables agents to send rich, interactive user interfaces directly within chat messages. Instead of plain text responses, agents can now present:

- **Checkboxes**: Multi-select options with descriptions
- **Buttons**: Action buttons with different variants (primary, secondary, danger)
- **Input Forms**: Text fields, textareas, and number inputs
- **Rich Responses**: Status alerts with success/error/info/warning states

## Components

### A2UIMessage.tsx

Core component library with four main widget types:

#### A2UICheckboxGroup
Renders a group of checkboxes with optional descriptions.

```typescript
<A2UICheckboxGroup
  title="Choose Options"
  description="Select the ones you prefer"
  checkboxes={[
    { id: "opt1", label: "Option 1", description: "First option" },
    { id: "opt2", label: "Option 2" },
  ]}
  onCheckboxChange={(id, checked) => console.log(id, checked)}
/>
```

#### A2UIButtonGroup
Renders a group of action buttons.

```typescript
<A2UIButtonGroup
  title="Actions"
  buttons={[
    { id: "btn1", label: "Approve", variant: "primary" },
    { id: "btn2", label: "Reject", variant: "danger" },
  ]}
  onButtonClick={(id) => console.log("Clicked:", id)}
/>
```

#### A2UIInputForm
Renders a form with various input field types.

```typescript
<A2UIInputForm
  title="Configuration"
  inputFields={[
    { id: "name", label: "Name", type: "text", required: true },
    { id: "description", label: "Description", type: "textarea" },
  ]}
  onInputSubmit={(data) => console.log("Form data:", data)}
/>
```

#### A2UIRichResponse
Renders a status alert with icon and message.

```typescript
<A2UIRichResponse
  title="Success"
  content="Operation completed successfully"
  status="success"
/>
```

### A2UIMessageRenderer.tsx

Smart renderer that detects A2UI widget syntax in markdown and renders the appropriate component.

## Widget Syntax

Agents can embed interactive widgets in their responses using the following markdown syntax:

### Checkbox Widget

```markdown
:::a2ui:checkbox
title: "Choose Options"
description: "Select the ones you prefer"
options:
  - id: opt1, label: "Option 1", description: "First option"
  - id: opt2, label: "Option 2"
:::
```

### Button Widget

```markdown
:::a2ui:button
title: "Actions"
buttons:
  - id: approve, label: "Approve", variant: "primary"
  - id: reject, label: "Reject", variant: "danger"
:::
```

### Input Widget

```markdown
:::a2ui:input
title: "Configuration"
fields:
  - id: name, label: "Agent Name", type: "text", required: true
  - id: description, label: "Description", type: "textarea"
:::
```

### Rich Response Widget

```markdown
:::a2ui:rich-response
title: "Success"
content: "Agent created successfully"
status: "success"
:::
```

## Integration with Agent Tools

The Lead Agent can use A2UI widgets to:

1. **Ask for confirmation** before performing actions
2. **Collect user input** for agent configuration
3. **Present options** for decision-making
4. **Show status updates** with visual feedback

### Example: Autonomous Agent Configuration

```typescript
// After creating an agent, the Lead Agent can ask:
:::a2ui:button
title: "Agent Configuration"
description: "Does this agent configuration look good?"
buttons:
  - id: approve, label: "Yes, looks good", variant: "primary"
  - id: refine, label: "Refine further", variant: "secondary"
  - id: cancel, label: "Cancel", variant: "danger"
:::
```

## Best Practices

1. **Keep it simple**: Use widgets for specific, focused interactions
2. **Provide context**: Always include a title and description
3. **Clear labels**: Make button and checkbox labels descriptive
4. **Progressive disclosure**: Use rich responses to confirm actions
5. **Accessibility**: Ensure all interactive elements have clear labels

## Implementation Details

### Widget Detection

The `A2UIMessageRenderer` uses regex to detect widget syntax in markdown:

```regex
:::a2ui:(\w+)\n([\s\S]*?)\n:::
```

### YAML-like Parsing

Widget configuration is parsed from a simple YAML-like format:

```
title: "Widget Title"
description: "Widget description"
options:
  - id: id1, label: "Label 1", description: "Description"
  - id: id2, label: "Label 2"
```

### Event Handling

All widgets emit events through the `onWidgetAction` callback:

```typescript
onWidgetAction?.("checkbox", "change", { id, checked });
onWidgetAction?.("button", "click", { id });
onWidgetAction?.("input", "submit", data);
```

## Future Enhancements

- [ ] Support for nested widgets
- [ ] Custom widget catalog definitions
- [ ] Widget state persistence
- [ ] Conditional widget rendering
- [ ] Multi-step form workflows
- [ ] Integration with A2UI v0.9 specification

## Related Files

- `src/components/chat/A2UIMessage.tsx` - Core widget components
- `src/components/chat/A2UIMessageRenderer.tsx` - Smart renderer
- `src/worker/agent/build-system-prompt.ts` - Lead Agent instructions
- `src/worker/agent/tools/system-control.ts` - Agent configuration tools
