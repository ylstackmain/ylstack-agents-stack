# Implementation Plan - Rebrand, Multi-Session Polish, Lead Agent Master Controls & Responsive UI Upgrade

An enterprise-ready plan to elevate the **YLStack Agent** application to production grade. This plan addresses rebranding, multi-session chat polishing, Lead Agent system controls, real-time Telegram sync indicators, unified responsive typography, and PWA optimization.

---

## ✅ Status: Nearly Complete

All core items have been implemented. Remaining issues were fixed:

### Fixed Issues (June 2, 2026)
- **Branding**: Changed `ylstack-agents-stack` to `YLStack` in sidebar header and mobile header
- **AI Providers Card**: Fixed data extraction bug (`data.providers` → `data` directly) - providers now display after save
- **System Control Tools**: Fixed TypeScript errors - tools now work correctly for Lead Agent
- **TypeScript Errors**: Fixed `LanguageModelV1` → `LanguageModel` and other type compatibility issues

---

## User Review Required

> [!NOTE]
> **Cloudflare KV vs. D1 + Durable Objects (DO) Storage**
> The current system leverages a highly advanced Cloudflare architecture:
>
> 1. **D1 Database (SQLite at the Edge):** Stores relational, structured dnpx  
ata such as agent configurations, custom AI providers, whitelists, and Telegram chat associations.
> 2. **Durable Objects (DO) Storage:** Provides transactionally consistent, sub-millisecond local key-value storage inside each agent session (`DownyAgent`) for active chat messages, todo plans, and background task states.
> 3. **R2 Buckets:** Stores heavy workspace files.
>
> **Design Decision:** Using Cloudflare KV for real-time transactional chat sessions or configuration updates would introduce _eventual consistency latency_ (up to 60 seconds), which causes out-of-order messages and race conditions in concurrent chat sessions.
> Therefore, we will keep the **state-of-the-art D1 + DO Storage** hybrid model for maximum consistency and real-time speed. However, we will perfectly integrate and optimize this storage engine, renaming all UI references to match the new brand.

---

## Proposed Changes

```mermaid
graph TD
    User([User]) <-->|WebSocket / Web UI| YLStackApp[YLStack Web Application]
    Telegram[Telegram Client] <-->|Webhooks| WebhookHandler[Telegram Webhook Handler]
    WebhookHandler <-->|D1 DB / RPC| DOAgent[Lead / Peer Durable Object Agent]

    subgraph Lead Agent (default) Controls
        DOAgent -->|If slug = 'default'| MasterTools[Master System Tools]
        MasterTools -->|Create/Manage| PeerAgents[Peer Agents]
        MasterTools -->|Manage Skills| PeerSkills[Skills / MCP Registry]
    end

    subgraph Data Layer
        DOAgent -->|DO Storage| DOChat[Consistent Chat State]
        DOAgent -->|D1 SQLite| D1DB[(D1 Database)]
        DOAgent -->|R2 Bucket| R2FS[(R2 Workspace Files)]
    end
```

### 1. Typography & Rebranding (Removing "Downy")

We will import premium Google Fonts (`Outfit` and `Inter`) and apply them globally. We will also replace all public branding elements with **YLStack**.

#### [MODIFY] [\_\_root.tsx](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/routes/__root.tsx)

- Update `<HeadContent />` and meta tags to include `YLStack Agent` as the application title.
- Link Google Fonts in the `head` function:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
  ```
- Change `ylstack-agents-stack` to `YLStack` in the sidebar and other headers.

#### [MODIFY] [styles.css](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/styles.css)

- Add global typography configuration:
  ```css
  html,
  body {
    font-family:
      "Outfit",
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
  }
  ```
- Ensure input boxes and buttons use unified fonts and matching border radii.

---

### 2. Multi-Session Management (Rename/Delete Chats)

Add interactive actions to the `SessionSwitcher` inside the sidebar so it functions like premium AI chat applications.

#### [MODIFY] [agent-panel-sections.tsx](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/components/chat/agent-panel-sections.tsx)

- Upgrade the `SessionSwitcher` list entries:
  - Display an "Edit/Rename" pencil icon and a "Delete" trash icon upon hover.
  - Clicking "Rename" renders a micro-input inline.
  - Clicking "Delete" prompts a confirmation dialog using `confirmDialog`.
- Implement associated mutation hooks `useUpdateSession` and `useDeleteSession` (mapping to the D1 backend).

---

### 3. Real-Time Telegram Sync Indicators

Add a dedicated visual state showing if a user message came from Telegram to enhance UI transparency.

#### [MODIFY] [MessageView.tsx](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/components/chat/MessageView.tsx)

- Check `message.metadata` for `telegram: true`.
- If present, render a subtle, stylish badge `via Telegram` next to the user name or message bubble, equipped with a Telegram icon.

---

### 4. Settings & Status Page Layout Uniformity

Align the appearance of `SettingsPage` and `SystemStatusPage` with the premium glassmorphism and theme system of the main application.

#### [MODIFY] [settings.status.tsx](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/routes/settings.status.tsx)

- Make full use of the active themes.
- Redesign metric boxes, badges, and statuses into unified cards.
- Ensure correct spacing so text inputs and selectors never look too big or too small.

---

### 5. Lead Agent Default (Complete System Access)

Equip the default agent (`default` slug, rebranded to `Lead Agent`) with administrative tools to command the rest of the workspace dynamically through chat.

#### [NEW] [system-control.ts](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/worker/agent/tools/system-control.ts)

Implement system control tools:

- `create_peer_agent({ slug, displayName })`: Creates a new sub-agent.
- `configure_peer_agent({ slug, key, value })`: Dynamically rewires the peer agent's grounding documents (`SOUL.md`, `IDENTITY.md`, etc.).
- `manage_peer_skills({ slug, action, name, code })`: Installs, updates, or purges reusable skills on sub-agents.
- `manage_peer_mcp({ slug, action, name, url })`: Directs sub-agent MCP hookups.

#### [MODIFY] [DownyAgent.ts](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/worker/agent/DownyAgent.ts)

- Mount the tools in `getTools()` only when `this.slug === "default"` to enforce secure scoping.

---

### 6. Custom AI Provider Model Selector

Allow users to easily define default models, fallback list sequences, and model IDs for OpenAI-compatible and custom providers.

#### [MODIFY] [AiProvidersCard.tsx](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/src/components/AiProvidersCard.tsx)

- Update the provider form fields to allow editing the fallback model list and custom model list strings.

---

### 7. PWA / Lighthouse Optimization

Ensure the app is fully progressive and audits with high scores on Lighthouse.

#### [MODIFY] [manifest.json](file:///d:/dev_workspace/artificial_intelligence/Agents/ylstack-agents-stack/public/manifest.json)

- Rename branding metadata to `YLStack Agent` / `YLStack`.
- Customize theme and background colors to match the premium dark/light mode configurations.

---

## Verification Plan

### Automated Verification

1. Compile and build the entire stack to verify code correctness:
   ```powershell
   pnpm build
   ```
2. Start the dev server:
   ```powershell
   pnpm dev
   ```

### Manual Verification

1. Verify the brand-new Google Fonts render correctly on the settings and status screens.
2. Create, rename, and delete sessions to verify multi-session CRUD actions.
3. Open a session, send a message through Telegram, and verify the message flashes instantly in the active web UI with a `via Telegram` tag.
4. Interact with the default Lead Agent in chat and ask it to: _"Create a new agent named writing-assistant and add a skill to correct punctuation"_ to verify the dynamic system controls.
