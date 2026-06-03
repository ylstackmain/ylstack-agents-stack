import {
   CreateAgentRequestBodySchema,
   UpdateAgentRequestBodySchema,
 } from "../../lib/api-schemas";
 import {
   archiveAgent,
   createAgent,
   getAgent,
   listAgents,
   renameAgent,
   setAgentPrivate,
   unarchiveAgent,
 } from "../db/profile";
 import { getAgentStub } from "../lib/get-agent";
 import type { DownyAgent } from "../agent/DownyAgent";
 import {
   IDENTITY_PATH,
   SOUL_PATH,
   generateDynamicSoul,
   generateDynamicIdentity,
 } from "../agent/core-files";

const JSON_HEADERS = { "content-type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Routes:
 *   GET    /api/agents             — list active agents (?archived=1 lists archived)
 *   POST   /api/agents             — body { slug, displayName }
 *   GET    /api/agents/:slug       — single agent
 *   PATCH  /api/agents/:slug       — body { displayName?, isPrivate? }
 *   POST   /api/agents/:slug/archive
 *   POST   /api/agents/:slug/unarchive
 */
export async function handleAgentsRequest(
  request: Request,
  env: Cloudflare.Env,
): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\//, "").split("/");
  // ["api", "agents", slug?, action?]
  const slug = parts[2];
  const action = parts[3];

  try {
    if (slug === undefined) {
      if (request.method === "GET") {
        const includeArchived = url.searchParams.get("archived") === "1";
        const agents = await listAgents(env.DB, { includeArchived });
        return json({ agents });
      }
if (request.method === "POST") {
         const raw: unknown = await request.json().catch(() => null);
         const parsed = CreateAgentRequestBodySchema.safeParse(raw);
         if (!parsed.success) {
           return json({ error: "Body must be { slug, displayName, description?, soulContent?, identityContent? }" }, 400);
         }
         const record = await createAgent(env.DB, parsed.data);
         // Determine SOUL.md content: custom > auto-generated > skip
         let finalSoulContent = parsed.data.soulContent;
         if (!finalSoulContent && parsed.data.description) {
           finalSoulContent = generateDynamicSoul(parsed.data.displayName, parsed.data.description);
         }
         // Determine IDENTITY.md content: custom > auto-generated > skip
         let finalIdentityContent = parsed.data.identityContent;
         if (!finalIdentityContent && parsed.data.description) {
           finalIdentityContent = generateDynamicIdentity(parsed.data.displayName, parsed.data.description, parsed.data.slug);
         }
         // Seed workspace with initial identity files if available
         if (finalSoulContent || finalIdentityContent) {
           try {
             const stub = await getAgentStub(env, `${record.slug}:default`) as DurableObjectStub<DownyAgent>;
             if (finalSoulContent) {
               await stub.writeCoreFile(SOUL_PATH, finalSoulContent);
             }
             if (finalIdentityContent) {
               await stub.writeCoreFile(IDENTITY_PATH, finalIdentityContent);
             }
           } catch (e) {
             // Log but don't fail the creation — workspace seeding is best-effort
             console.warn("Failed to seed workspace for new agent", {
               slug: record.slug,
               error: e instanceof Error ? e.message : String(e),
             });
           }
         }
         return json({ agent: record }, 201);
       }
      return json({ error: "Method not allowed" }, 405);
    }

    if (action === undefined) {
      if (request.method === "GET") {
        const agent = await getAgent(env.DB, slug);
        if (!agent) return json({ error: "Not found" }, 404);
        return json({ agent });
      }
      if (request.method === "PATCH") {
        const raw: unknown = await request.json().catch(() => null);
        const parsed = UpdateAgentRequestBodySchema.safeParse(raw);
        if (!parsed.success) {
          return json(
            { error: "Body must be { displayName?, description?, isPrivate? }" },
            400,
          );
        }
        let agent = await getAgent(env.DB, slug);
        if (!agent) return json({ error: "Not found" }, 404);
        if (parsed.data.displayName !== undefined) {
          agent = await renameAgent(env.DB, slug, parsed.data.displayName);
        }
        if (parsed.data.isPrivate !== undefined) {
          agent = await setAgentPrivate(env.DB, slug, parsed.data.isPrivate);
        }
        return json({ agent });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (action === "archive" && request.method === "POST") {
      const agent = await archiveAgent(env.DB, slug);
      return json({ agent });
    }
    if (action === "unarchive" && request.method === "POST") {
      const agent = await unarchiveAgent(env.DB, slug);
      return json({ agent });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("[/api/agents] request failed", {
      method: request.method,
      path: url.pathname,
      error: errorMessage(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return json({ error: errorMessage(err) }, 500);
  }
}
