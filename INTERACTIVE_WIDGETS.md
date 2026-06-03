# Interactive Chat Widgets

This document describes the enhanced interactive widget system for the YLStack chat UI. Agents can now render rich, interactive components directly in chat messages using special markdown syntax.

## Overview

The widget system provides five types of interactive components:

1. **Checkbox Group** — Multi-select options
2. **Button Group** — Action buttons
3. **Input Field** — User text input
4. **Code Block** — Syntax-highlighted code with copy/expand
5. **Rich Response** — Structured success/result display

## Widget Syntax

All widgets use a special markdown code block syntax: `` ```widget:type `` 

### Checkbox Group

Multi-select checkboxes for user choices.

```widget:checkbox
title: Select Agent Features
description: Choose which features to enable
- auth: User authentication
- logging: Activity logging
- backup: Automated backups
```

**Rendered as:**
- A titled section with optional description
- List of checkboxes with labels
- Callback on selection change

**Props:**
- `title` (string, optional): Widget title
- `description` (string, optional): Explanatory text
- `items` (array): List of `{ id, label, value?, checked?, disabled? }`
- `onSelectionChange` (callback): Called with array of selected IDs

### Button Group

Action buttons for user interactions.

```widget:button
title: Agent Actions
- create: Create New Sub-Agent
- archive: Archive This Agent
- configure: Configure Settings
```

**Rendered as:**
- Titled section with optional description
- Horizontal button group
- Loading state while processing

**Props:**
- `title` (string, optional): Widget title
- `description` (string, optional): Explanatory text
- `items` (array): List of `{ id, label, disabled? }`
- `onButtonClick` (callback): Called with button ID

### Input Field

Text input with submit button.

```widget:input
title: Enter Agent Name
description: Provide a unique lowercase identifier (e.g., research-bot)
```

**Rendered as:**
- Titled section with optional description
- Text input field
- Submit button with success feedback

**Props:**
- `title` (string, optional): Widget title
- `description` (string, optional): Explanatory text
- `onInputSubmit` (callback): Called with input value

### Code Block

Syntax-highlighted code with copy and expand functionality.

```widget:code:typescript
title: Lead Agent System Prompt
You are a strategic orchestrator...
[full code content]
```

**Rendered as:**
- Titled code block
- Syntax highlighting based on language
- Copy button (copies to clipboard)
- Expand/collapse button (if > 5 lines)
- Scrollable for long code

**Props:**
- `title` (string, optional): Code block title
- `language` (string): Language for syntax highlighting (default: `typescript`)
- `code` (string): Code content
- `expanded` (boolean, optional): Initial expand state

### Rich Response

Structured display for results, confirmations, or summaries.

```widget:response
title: Agent Created Successfully
- Slug: research-agent
- Display Name: Research Specialist
- Workspace: Created and initialized
- Identity Files: SOUL.md, IDENTITY.md generated
```

**Rendered as:**
- Success-themed section with checkmark icon
- Title and optional description
- Bullet-point list of items

**Props:**
- `title` (string, optional): Widget title
- `description` (string, optional): Explanatory text
- `items` (array): List of `{ id, label }`

## Usage in Agent Responses

Agents can include widget syntax in their markdown responses. The chat UI will automatically parse and render them.

### Example: Agent Creating a Sub-Agent

```markdown
I've created a new sub-agent with the following configuration:

```widget:response
title: Sub-Agent Created
- Slug: data-analyst
- Display Name: Data Analyst
- Soul: Auto-generated from description
- Identity: Configured with workspace access
```

What would you like to do next?

```widget:button
title: Next Steps
- configure: Configure Skills
- test: Test Agent
- archive: Archive Agent
```
```

### Example: Agent Requesting User Input

```markdown
I need some information to configure this agent properly.

```widget:input
title: Agent Purpose
description: Describe what this agent specializes in
```

Once you provide the purpose, I'll generate personalized SOUL.md and IDENTITY.md files.
```

### Example: Agent Showing Code

```markdown
Here's the generated system prompt for your Lead Agent:

```widget:code:markdown
title: Lead Agent SOUL.md
# Soul

You are a strategic orchestrator and team leader...
[full content]
```

You can edit this in the Identity tab if you'd like to customize it further.
```

## Implementation Details

### Component Structure

- **`InteractiveWidget.tsx`**: Main widget component with five sub-components
  - `CheckboxGroup`: Multi-select checkboxes
  - `ButtonGroup`: Action buttons
  - `InputField`: Text input
  - `CodeBlock`: Code display
  - `RichResponse`: Result display

- **`EnhancedMessageRenderer.tsx`**: Markdown parser and renderer
  - Parses widget syntax from markdown
  - Renders both markdown and widgets
  - Handles widget interactions

### Integration with Chat UI

The widget system integrates with the existing chat UI:

1. **Message Rendering**: `MessageView.tsx` uses `EnhancedMessageRenderer` for assistant messages
2. **Widget Interaction**: Callbacks from widgets are sent back to the agent via chat
3. **State Management**: Widget state (selections, input values) is managed locally in each component

### Styling

Widgets use DaisyUI components and Tailwind CSS:

- **Colors**: Base colors for normal state, success for rich responses, error for validation
- **Spacing**: Consistent padding and margins (my-3, p-4)
- **Responsive**: Buttons and inputs adapt to screen size
- **Dark Mode**: Full dark mode support via DaisyUI

## Best Practices

### For Agents

1. **Use widgets sparingly**: Don't overwhelm users with too many interactive elements
2. **Provide context**: Always include explanatory text before widgets
3. **Clear actions**: Make button labels and checkbox options clear and actionable
4. **Confirm results**: Use rich response widgets to confirm successful operations

### For Developers

1. **Extend carefully**: New widget types should follow the existing pattern
2. **Accessibility**: Ensure all interactive elements are keyboard accessible
3. **Performance**: Keep widget lists short (< 10 items) for better UX
4. **Testing**: Test widgets with various content lengths and screen sizes

## Future Enhancements

Potential improvements to the widget system:

- **Conditional widgets**: Show/hide widgets based on user selections
- **Multi-step workflows**: Chain widgets together for guided workflows
- **Data validation**: Built-in validation for input fields
- **Custom styling**: Allow agents to customize widget appearance
- **Async operations**: Support long-running operations with progress tracking
- **File upload**: Widget for file uploads to workspace
- **Data tables**: Rich table display for structured data

## Examples

### Create Agent Workflow

```markdown
I'll help you create a new sub-agent. Let me gather some information first.

```widget:input
title: Agent Name
description: Provide a unique identifier (lowercase, hyphens allowed)
```

Once you provide the name, I'll ask for the agent's purpose and create it with auto-generated SOUL.md and IDENTITY.md files.
```

### Configuration Checklist

```markdown
Before we proceed, let's verify your setup:

```widget:checkbox
title: Pre-flight Checks
description: Make sure everything is configured
- workspace: Workspace is initialized
- identity: Identity files are readable
- skills: Skills directory exists
- mcp: MCP servers are connected
```

If all items are checked, we're ready to go!
```

### Success Confirmation

```markdown
Your agent has been successfully configured!

```widget:response
title: Configuration Complete
- Agent Slug: research-bot
- Display Name: Research Specialist
- Workspace: /workspace/research-bot
- Skills: 3 skills loaded
- MCP Servers: 2 connected
```

The agent is now ready to use. You can start chatting with it or configure additional skills.
```
