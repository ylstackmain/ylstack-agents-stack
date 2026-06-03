import { tool } from "ai";
import { z } from "zod";
import { createAgent, archiveAgent } from "../../db/profile";
import type { DownyAgent } from "../DownyAgent";
import { getAgentByName } from "agents";
import {
  IDENTITY_PATH,
  SOUL_PATH,
} from "../core-files";

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
        "Create a new sub-agent. The slug must be lowercase, digits, hyphens, starting with a letter. Optional soulContent and identityContent let you configure the agent immediately.",
      inputSchema: z.object({
        slug: z.string().describe("Unique identifier for the agent"),
        displayName: z.string().describe("Human readable name"),
        soulContent: z.string().optional().describe("Custom SOUL.md content for the sub-agent"),
        identityContent: z.string().optional().describe("Custom IDENTITY.md content for the sub-agent"),
      }),
      execute: async ({ slug, displayName, soulContent, identityContent }) => {
        try {
          const record = await createAgent(args.env.DB, { slug, displayName });
          // Seed workspace with initial identity files if provided
          if (soulContent || identityContent) {
            const stub = await getPeerStub(slug);
            if (soulContent) {
              await stub.writeCoreFile(SOUL_PATH, soulContent);
            }
            if (identityContent) {
              await stub.writeCoreFile(IDENTITY_PATH, identityContent);
            }
          }
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
