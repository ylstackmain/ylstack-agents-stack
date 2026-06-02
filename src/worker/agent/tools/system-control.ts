import { tool } from "ai";
import { z } from "zod";
import { createAgent, archiveAgent } from "../../db/profile";
import type { DownyAgent } from "../DownyAgent";
import { getAgentByName } from "agents";

// We require `agent` to make DO RPC calls and DB calls.
export function createSystemControlTools(args: {
  agent: DownyAgent;
  env: Cloudflare.Env;
}) {
  const getPeerStub = async (slug: string) => {
    return getAgentByName<Cloudflare.Env, DownyAgent>(
      args.env.DownyAgent,
      `${slug}:default`,
    );
  };

  return {
    create_agent: tool({
      description:
        "Create a new sub-agent. The slug must be lowercase, digits, hyphens, starting with a letter.",
      inputSchema: z.object({
        slug: z.string().describe("Unique identifier for the agent"),
        displayName: z.string().describe("Human readable name"),
      }),
      execute: async ({ slug, displayName }) => {
        try {
          const record = await createAgent(args.env.DB, { slug, displayName });
          return { success: true, record };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    archive_agent: tool({
      description: "Archive (delete) a sub-agent.",
      inputSchema: z.object({
        slug: z.string().describe("The slug of the agent to archive"),
      }),
      execute: async ({ slug }) => {
        try {
          const record = await archiveAgent(args.env.DB, slug);
          return { success: true, record };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    write_peer_core_file: tool({
      description:
        "Write to a peer agent's core identity file (e.g., identity/SOUL.md, identity/IDENTITY.md). Use this to dynamically shape a sub-agent's personality and instructions.",
      inputSchema: z.object({
        slug: z.string().describe("The peer agent's slug"),
        path: z
          .string()
          .describe("Path to the core file (e.g. identity/IDENTITY.md)"),
        content: z.string().describe("The new markdown content"),
      }),
      execute: async ({ slug, path, content }) => {
        try {
          const stub = await getPeerStub(slug);
          await stub.writeCoreFile(path, content);
          return { success: true, path };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    write_peer_skill: tool({
      description:
        "Create or update a skill for a peer agent. Skills are saved in the skills/ directory.",
      inputSchema: z.object({
        slug: z.string().describe("The peer agent's slug"),
        skillName: z
          .string()
          .describe("Name of the skill file (e.g. hello.md)"),
        content: z
          .string()
          .describe("The markdown content of the skill including frontmatter"),
      }),
      execute: async ({ slug, skillName, content }) => {
        try {
          const stub = await getPeerStub(slug);
          const path = `skills/${skillName.replace(/\.md$/, "")}.md`;
          await stub.writeWorkspaceFile(path, content);
          return { success: true, path };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),
  };
}
