# ylstack-agents-stack — Technical Plan

## Context

This is a single-user, Cloudflare-hosted personal agent app. The frontend is a TanStack Start/React app served by the same Worker that handles agent APIs. The backend runs on Cloudflare Workers, Durable Objects, D1, R2, and Workers AI.

The app is multi-agent within one deployment. Each named agent has its own `DownyAgent` Durable Object instance keyed by slug. The root route redirects to the default agent, and all agent-specific screens live under `/agent/:slug/...`.

---

## Current Architecture (Implemented)

### Backend

**`src/server.ts`** — Worker entry point. Composes TanStack Start server rendering with custom REST API handlers. Cloudflare Access verification happens here (except on localhost). REST API requests dispatch to handlers under `src/worker/handlers/`. Agent WebSocket/chat requests fall through to `routeAgentRequest()` from `agents`.

**Durable Objects:**

- **`DownyAgent`** (`src/worker/agent/DownyAgent.ts`) — user-facing chat agent. One instance per agent slug. Owns:
  - Think chat/session state for one agent
  - Per-agent `Workspace` (DO SQLite + R2)
  - Live MCP connections
  - Background task records in DO storage
  - Bootstrap state and synthetic bootstrap kickoff
  - Peer-agent read-only RPC methods

- **`ChildAgent`** (`src/worker/agent/ChildAgent.ts`) — background worker agent. One instance per task. Owns:
  - One background task transcript and metadata
  - The LLM loop for a dispatched task
  - A remote workspace proxy that forwards file operations to the parent `DownyAgent`
  - MCP proxy tools that call through the parent agent's live MCP connections

### Frontend

Root route handles theme bootstrapping, React Query, the mobile header, and TanStack devtools in development.

Agent routes are under `/agent/:slug/...`:

- `/agent/:slug/` — chat
- `/agent/:slug/identity` — identity files (`SOUL.md`, `IDENTITY.md`, `MEMORY.md`, `USER.md`)
- `/agent/:slug/workspace` — workspace files
- `/agent/:slug/skills` — skill catalog
- `/agent/:slug/mcp` — MCP status
- `/agent/:slug/background-tasks` — task history/detail
- `/agent/:slug/settings` — agent-level settings

User-level settings live under `/settings`.

### Storage Boundaries

- **D1** stores deployment-level data: agent registry (slug, display name, privacy, archive), shared user profile (`identity/USER.md`), and user preferences (theme, AI provider, etc.).
- **R2** stores workspace file bytes through `@cloudflare/shell` `Workspace`.
- **Durable Object storage** stores agent-local runtime state: Think session/chat state, bootstrap sentinel, background task records, and MCP connection config.

### Identity Model

The UI and tools expose four identity files under `identity/`:

- `identity/SOUL.md`, `identity/IDENTITY.md`, and `identity/MEMORY.md` — agent-level files in that agent's workspace
- `identity/USER.md` — user-level state in D1, shared by all agents

`DownyAgent.beforeTurn()` reads the agent files, the shared user file, peer-agent metadata, skills, and bootstrap state to build the per-turn system prompt.

### Tool Surface

Shared parent/child tools are built in `src/worker/agent/tool-registry.ts` via `buildSharedToolSet`. Both agents call this and merge in their own additions:

- `web_search` / `web_scrape` — parallel bulk web search/scrape via Exa
- `read_peer_agent` — DO-to-DO RPC to read another agent's workspace/identity
- Skill CRUD tools: `list_skills`, `read_skill`, `list_skill_files`, `create_skill`, `update_skill`, `delete_skill`
- File tools: `write`, `move`, `copy`, `read`, `edit`, `delete`
- `write_user_profile` / `read_user_profile`
- `todo_write` — persists checklist into DO storage

Parent-only tools (added in `DownyAgent#getTools`):

- `spawn_background_task` — creates a `ChildAgent` task
- `connect_mcp_server` / `list_mcp_servers` / `disconnect_mcp_server`

### Background Tasks

Background tasks run as child Durable Objects:

1. Parent calls `spawn_background_task` with a brief
2. `ChildAgent` stores metadata and runs one Think turn
3. Child uses parent workspace/MCP proxies (via DO-to-DO RPC)
4. Child returns final markdown with `slug:` header
5. Parent writes result to `workspace/notes/<slug>.md`
6. Parent injects synthetic completion message into chat

Child agents intentionally cannot spawn nested background tasks or connect MCP servers. They inherit access through parent RPC.

## Key Files Today

| File                                  | Role                                  |
| ------------------------------------- | ------------------------------------- |
| `src/server.ts`                       | Worker entry, exports `DownyAgent` DO |
| `src/worker/agent/DownyAgent.ts`      | Parent agent DO class                 |
| `src/worker/agent/ChildAgent.ts`      | Background task DO class              |
| `src/worker/agent/RemoteWorkspace.ts` | Proxy workspace for child agents      |
| `src/worker/agent/mcp-proxy.ts`       | MCP tool proxy helpers                |
| `src/worker/agent/tool-registry.ts`   | Shared tool set builder               |
| `src/worker/handlers/*`               | REST API handlers                     |
| `src/worker/lib/get-agent.ts`         | DO stub lookup                        |
| `src/lib/theme.ts`                    | Theme system                          |
| `src/lib/preferences.ts`              | Preference hooks                      |
| `wrangler.jsonc`                      | Cloudflare bindings config            |
