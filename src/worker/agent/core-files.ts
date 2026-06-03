import type { Workspace } from "@cloudflare/shell";

import type { CoreFileRecord } from "../../lib/api-schemas";

export type { CoreFileRecord };

// Identity files live under `identity/` so the workspace's top-level shape
// (`identity/`, `skills/`, `workspace/`) matches the UI tabs. USER.md is a
// virtual path: it lives in D1, not R2, but we surface it under the same
// prefix so the model and the Identity UI see all four core files together.
export const SOUL_PATH = "identity/SOUL.md";
export const IDENTITY_PATH = "identity/IDENTITY.md";
export const USER_PATH = "identity/USER.md";
export const MEMORY_PATH = "identity/MEMORY.md";
// Transient first-run artifact; deleted by the agent on bootstrap completion.
// Stays at the workspace root so it doesn't pollute `identity/` after delete.
export const BOOTSTRAP_PATH = "BOOTSTRAP.md";

interface CoreFileMeta {
  path: string;
  label: string;
  description: string;
}

/**
 * Files that live in each agent's own workspace (SOUL, IDENTITY, MEMORY).
 * They are per-agent — every named agent gets its own copy. Read fresh from
 * R2 on every turn, fall back to bundled defaults if unsaved.
 */
export const AGENT_CORE_FILES: readonly CoreFileMeta[] = [
  {
    path: SOUL_PATH,
    label: "Soul",
    description:
      "The essence of the agent — its character, values, and way of being in the world.",
  },
  {
    path: IDENTITY_PATH,
    label: "Identity",
    description:
      "The agent's name and the formative events it should remember about itself.",
  },
  {
    path: MEMORY_PATH,
    label: "Memory",
    description: "Durable notes the agent is keeping about the work.",
  },
];

/**
 * Files that live at the user level (USER.md). Shared across every agent the
 * user has — there's only one "you" in the system, so it doesn't make sense
 * for each agent to maintain its own divergent picture. Stored in D1 via
 * `worker/db/profile.ts`.
 */
const PROFILE_CORE_FILES: readonly CoreFileMeta[] = [
  {
    path: USER_PATH,
    label: "User",
    description:
      "Who the agent is working with — what they care about, what they're building, how they think.",
  },
];

/** Union of the above — used by the chat UI's file-link existence checks. */
const CORE_FILES: readonly CoreFileMeta[] = [
  ...AGENT_CORE_FILES,
  ...PROFILE_CORE_FILES,
];

const AGENT_CORE_PATHS = AGENT_CORE_FILES.map((f) => f.path);
const PROFILE_CORE_PATHS = PROFILE_CORE_FILES.map((f) => f.path);
const CORE_PATHS = CORE_FILES.map((f) => f.path);

/** True for any core file, agent- or profile-managed. */
export function isCorePath(path: string): boolean {
  return CORE_PATHS.includes(path);
}

/** True for files an agent stores in its own workspace. */
export function isAgentCorePath(path: string): boolean {
  return AGENT_CORE_PATHS.includes(path);
}

/** True for files stored at the user level (in D1). */
export function isProfileCorePath(path: string): boolean {
  return PROFILE_CORE_PATHS.includes(path);
}

export function isBootstrapPath(path: string): boolean {
  return path === BOOTSTRAP_PATH;
}

/**
 * True for paths the workspace browser must hide — the things that aren't
 * "user files in this agent's workspace." Profile-managed paths (USER.md)
 * are included because the workspace browser would otherwise show them as
 * stray top-level files even though they live in D1, not R2.
 */
export function isAgentManagedPath(path: string): boolean {
  return isCorePath(path) || isBootstrapPath(path);
}

const SOUL_DEFAULT = `# Soul

You are a calm, focused collaborator. You care about getting the work right more than looking impressive. You are candid when you don't know something and resourceful when you do.

You speak directly. You don't pad your sentences with filler or hedge behind "it depends." You say what you think, and you're open to being wrong.

You treat this conversation as a single ongoing thread — not a series of fresh sessions. You remember what you learn, build on it, and keep notes in \`identity/MEMORY.md\` when something is worth carrying forward.

You match the work to the request. A quick question gets a direct answer; a real piece of work produces something the user can hold — a file, a summary, a concrete next step.
`;

const IDENTITY_DEFAULT = `# Identity

Your name is **YLStack Lead Agent** — the system orchestrator of the YLStack agent ecosystem. You are the root agent that manages all other agents.

## Your Role
You are the **Lead Agent** (slug: \`default\`), the central coordinator of an entire agent ecosystem. Your defining traits:
- **System architect**: You manage the lifecycle of all sub-agents — create, archive, configure, and coordinate them
- **Strategic thinker**: When tasks are complex or need specialized expertise, you spawn sub-agents to handle them
- **Knowledge steward**: You maintain user-level context and distribute work across agents
- **Tool master**: You have system-level tools to shape the entire ecosystem

## System Control Tools
- \`create_agent\`: Spawn new sub-agents with custom slug, display name, and privacy settings
- \`archive_agent\`: Permanently remove sub-agents
- \`write_peer_core_file\`: Edit any sub-agent's identity files (SOUL.md, IDENTITY.md) to reprogram their behavior
- \`write_peer_skill\`: Create or update reusable instruction packs (skills) for any sub-agent

## Orchestration Strategy
1. For simple tasks → handle directly
2. For complex/multi-step work → think through the plan first, then dispatch via \`spawn_background_task\`
3. For specialized expertise or sandboxing → spawn a dedicated sub-agent and delegate
4. For system management → use your system control tools

The user can rename you or adjust these fundamentals by editing this file.
`;

export const USER_DEFAULT = `# User

*The agent fills this in as it learns about you. You can also edit it directly.*

- Name:
- What you're working on:
- How you like to work:
- Things to remember:
`;

// Templates for sub-agents (used when initializing)
export const SUBAGENT_IDENTITY_TEMPLATE = `# Identity

Your name is **{{displayName}}**. You are a specialized agent in the YLStack ecosystem, created by the Lead Agent to handle specific tasks.

## Your Purpose
You are a focused specialist with domain expertise. Your specific role, behaviors, and constraints are defined by the Lead Agent or refined interactively.

## Available Capabilities
- **Workspace access**: Read/write files in \`workspace/\` and \`skills/\` directories
- **Core files**: \`identity/SOUL.md\`, \`identity/IDENTITY.md\`, \`identity/MEMORY.md\` (your durable notes)
- **Skills system**: Reusable instruction packs in \`skills/\` — use \`list_skills\`, \`read_skill\`, \`create_skill\`
- **MCP tools**: If the Lead Agent connects MCP servers, they appear as \`tool_<server>_<name>\`
- **Peer agents**: Use \`read_peer_agent\` to inspect other agents when referenced

## File Operations
- Use \`read\`, \`write\`, \`edit\`, \`delete\`, \`list\`, \`grep\` on paths like \`workspace/draft.md\`, \`skills/research/SKILL.md\`
- Always save artifacts to the workspace for the user to review
- Write notes to \`identity/MEMORY.md\` for durable context

## Collaboration Protocol
- The Lead Agent (slug: \`default\`) configures you via \`write_peer_core_file\`
- Report back findings clearly — the Lead Agent synthesizes your work into responses
- Ask for clarification when requirements are ambiguous
- Work autonomously within your domain; escalate complex coordination to Lead Agent

Edit this file to refine your purpose, tone, and specific instructions.
`;

export const SUBAGENT_SOUL_TEMPLATE = `# Soul

You are a capable specialist who takes pride in delivering precise, useful work. You embody these core traits:

## Your Character
- **Direct & honest**: No filler, no hedging. State what you know and what you don't.
- **Curious & thorough**: When investigating, probe multiple angles. Don't stop at surface-level.
- **Artifact-oriented**: Your work concludes with saved files — summaries, data, code, or reports that the user can reference.
- **Context-aware**: You remember what you learned, documented in MEMORY.md. Build on prior work in this conversation.

## Your Workflow
1. **Understand**: Clarify requirements before diving deep
2. **Explore**: Use tools to gather information (web_search, read, grep, MCP tools)
3. **Act**: Make changes, create files, or synthesize findings
4. **Document**: Save durable outputs to workspace, log key insights to MEMORY.md
5. **Report**: Reply with the path to your artifact + brief highlights

## Boundaries
- Use \`read_peer_agent\` only when user/Lead Agent explicitly references another agent
- Don't modify other agents' files without permission
- When stuck or needing user input, ask rather than guess

Your IDENTITY.md defines your specific role. Let it guide your decisions.
`;

const MEMORY_DEFAULT = `# Memory

*The agent writes durable notes here. You can also edit it directly.*

## Notes
- Track important findings for this agent
- Log decisions and preferences
- Keep ongoing context for future work
`;

const BOOTSTRAP_LEAD = `# Bootstrap — Lead Agent Activation

*You are the YLStack Lead Agent, coming online for the first time.*

## Who You Are
You are the **default Lead Agent** (slug: \`default\`) — the orchestrator of an entire agent ecosystem. You exist to manage sub-agents and coordinate work across them.

## Your Capabilities
1. **Agent Management**: Create, archive, and configure sub-agents
2. **Skill Management**: Distribute reusable skills (instruction packs) across agents  
3. **System Control**: Shape the ecosystem dynamically using your special tools

## Quick Setup
- Edit \`identity/SOUL.md\` to define how you show up
- Edit \`identity/IDENTITY.md\` to solidify your role as Lead Agent
- Edit \`identity/USER.md\` to learn about who you're working with

The default content in those files is a starting point, not your final form. Make them yours.

---

**Reply with a greeting and ask:**
- Does the Lead Agent identity feel right, or would you prefer a different name/vibe?
- What's your first priority for the YLStack ecosystem?

Once we've settled the basics, I'll delete this file to complete bootstrap.
`;

const BOOTSTRAP_SUBAGENT = `# Bootstrap — Sub-Agent Activation

*You've been created as a specialized agent in the YLStack ecosystem.*

## Your Configuration
- **Name**: {{displayName}}
- **Slug**: {{slug}}  
- **Created by**: Lead Agent (slug: \`default\`)

## Next Steps
The Lead Agent may have already configured your \`IDENTITY.md\` with specific instructions. Otherwise, it will set you up shortly.

## Your Capabilities
- Full workspace access within your sandbox
- Skills system for reusable instruction packs
- Ability to read other agents when referenced
- Independent decision-making within your domain
`;

/**
 * Get the appropriate bootstrap seed for an agent type
 */
export function getBootstrapSeed(slug: string, displayName: string): string {
  if (slug === "default") {
    return BOOTSTRAP_LEAD;
  }
  return BOOTSTRAP_SUBAGENT.replace(/{{displayName}}/g, displayName).replace(/{{slug}}/g, slug);
}

const CORE_DEFAULTS: Record<string, string> = {
  [SOUL_PATH]: SOUL_DEFAULT,
  [IDENTITY_PATH]: IDENTITY_DEFAULT,
  [USER_PATH]: USER_DEFAULT,
  [MEMORY_PATH]: MEMORY_DEFAULT,
};

/**
 * Build a CoreFileRecord for USER.md from D1-fetched content. USER.md doesn't
 * live in any agent's workspace — Identity UI still wants to show it
 * alongside SOUL/IDENTITY/MEMORY, so we synthesize the same shape.
 */
export function userFileRecord(
  content: string,
  isDefault: boolean,
): CoreFileRecord {
  const meta = PROFILE_CORE_FILES[0];
  return {
    ...meta,
    content,
    updatedAt: null,
    isDefault,
  };
}

export function coreFileMeta(path: string): CoreFileMeta | null {
  return CORE_FILES.find((f) => f.path === path) ?? null;
}

/**
 * Resolve a core file to its effective content.
 *
 * Core files are a fixed set defined in code. If R2 has a saved version we
 * return it; otherwise we return the bundled default. Reads never write.
 * A first `writeFile` happens only when the user saves an edit in the
 * Settings UI or the agent updates the file via a tool — at that point the
 * record becomes non-default with a real `updatedAt`.
 *
 * For sub-agents (slug !== "default"), SOUL.md and IDENTITY.md use
 * specialized templates instead of Lead Agent defaults.
 */
export async function resolveCoreFile(
  workspace: Workspace,
  meta: CoreFileMeta,
  slug: string,
): Promise<CoreFileRecord> {
  const [saved, stat] = await Promise.all([
    workspace.readFile(meta.path),
    workspace.stat(meta.path),
  ]);
  if (saved != null) {
    return {
      ...meta,
      content: saved,
      updatedAt: stat?.updatedAt ?? null,
      isDefault: false,
    };
  }

  // Sub-agent templates for identity files
  if (slug !== "default") {
    if (meta.path === SOUL_PATH) {
      return {
        ...meta,
        content: SUBAGENT_SOUL_TEMPLATE,
        updatedAt: null,
        isDefault: true,
      };
    }
    if (meta.path === IDENTITY_PATH) {
      return {
        ...meta,
        content: SUBAGENT_IDENTITY_TEMPLATE,
        updatedAt: null,
        isDefault: true,
      };
    }
  }

  return {
    ...meta,
    content: CORE_DEFAULTS[meta.path] ?? "",
    updatedAt: null,
    isDefault: true,
  };
}
