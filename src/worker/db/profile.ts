import { isValidSlug } from "../lib/get-agent";
import { USER_DEFAULT } from "../agent/core-files";

export type AgentRecord = {
  slug: string;
  displayName: string;
  isPrivate: boolean;
  archivedAt: number | null;
  createdAt: number;
};

const USER_FILE_KEY = "user_file";

type AgentRow = {
  slug: string;
  display_name: string;
  is_private: number;
  archived_at: number | null;
  created_at: number;
};

function rowToRecord(row: AgentRow): AgentRecord {
  return {
    slug: row.slug,
    displayName: row.display_name,
    isPrivate: row.is_private !== 0,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

let schemaEnsured = false;
export async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaEnsured) return;
  try {
    // 1. Ensure agents table
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS agents (
        slug         TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        is_private   INTEGER NOT NULL DEFAULT 0,
        archived_at  INTEGER,
        created_at   INTEGER NOT NULL
      )
    `,
      )
      .run();

    // 2. Ensure user_profile_kv table
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS user_profile_kv (
        key          TEXT PRIMARY KEY,
        value        TEXT NOT NULL,
        updated_at   INTEGER NOT NULL DEFAULT 0
      )
    `,
      )
      .run();

    // 3. Ensure sessions table
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS sessions (
        id           TEXT PRIMARY KEY,
        agent_slug   TEXT NOT NULL,
        title        TEXT NOT NULL,
        created_at   INTEGER NOT NULL,
        FOREIGN KEY (agent_slug) REFERENCES agents(slug)
      )
    `,
      )
      .run();
    try {
      await db
        .prepare(
          `CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions (agent_slug)`,
        )
        .run();
    } catch {}

    // 4. Ensure ai_providers table
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS ai_providers (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        type         TEXT NOT NULL,
        api_key      TEXT,
        endpoint     TEXT,
        is_default   INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL
      )
    `,
      )
      .run();

    // Ensure model_id column exists in ai_providers
    try {
      await db
        .prepare(`ALTER TABLE ai_providers ADD COLUMN model_id TEXT`)
        .run();
    } catch (e: any) {
      // Ignore if column already exists
    }

    // 5. Ensure telegram_chats table
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS telegram_chats (
        telegram_chat_id TEXT PRIMARY KEY,
        agent_slug       TEXT NOT NULL,
        session_id       TEXT NOT NULL,
        FOREIGN KEY (agent_slug) REFERENCES agents(slug),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `,
      )
      .run();

    schemaEnsured = true;
  } catch (err) {
    console.error("Failed to ensure DB schema", err);
  }
}

export async function listAgents(
  db: D1Database,
  opts?: { includeArchived?: boolean },
): Promise<AgentRecord[]> {
  await ensureSchema(db);
  const sql = opts?.includeArchived
    ? "SELECT * FROM agents ORDER BY created_at"
    : "SELECT * FROM agents WHERE archived_at IS NULL ORDER BY created_at";
  const result = await db.prepare(sql).all<AgentRow>();
  const records = (result.results ?? []).map(rowToRecord);

  if (!records.some((r) => r.slug === "default")) {
    records.unshift({
      slug: "default",
      displayName: "Lead Agent",
      isPrivate: false,
      archivedAt: null,
      createdAt: 1718873200000,
    });
  }
  return records;
}

export async function getAgent(
  db: D1Database,
  slug: string,
): Promise<AgentRecord | null> {
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT * FROM agents WHERE slug = ?")
    .bind(slug)
    .first<AgentRow>();
  if (row) return rowToRecord(row);
  if (slug === "default") {
    return {
      slug: "default",
      displayName: "Lead Agent",
      isPrivate: false,
      archivedAt: null,
      createdAt: 1718873200000,
    };
  }
  return null;
}

export async function createAgent(
  db: D1Database,
  input: { slug: string; displayName: string },
): Promise<AgentRecord> {
  await ensureSchema(db);
  if (!isValidSlug(input.slug)) {
    throw new Error(`Invalid slug: ${input.slug}`);
  }
  const trimmed = input.displayName.trim();
  if (!trimmed) throw new Error("displayName is required");
  if (trimmed.length > 64) throw new Error("displayName too long (max 64)");
  const now = Date.now();
  const result = await db
    .prepare(
      "INSERT INTO agents (slug, display_name, is_private, archived_at, created_at) VALUES (?, ?, 0, NULL, ?) ON CONFLICT (slug) DO NOTHING",
    )
    .bind(input.slug, trimmed, now)
    .run();
  const changes = result.meta?.changes ?? 0;
  if (changes === 0) {
    throw new Error(`Slug already in use: ${input.slug}`);
  }
  const created = await getAgent(db, input.slug);
  if (!created) {
    throw new Error("Failed to read back created agent");
  }
  return created;
}

export async function renameAgent(
  db: D1Database,
  slug: string,
  displayName: string,
): Promise<AgentRecord> {
  await ensureSchema(db);
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error("displayName is required");
  if (trimmed.length > 64) throw new Error("displayName too long (max 64)");
  const result = await db
    .prepare("UPDATE agents SET display_name = ? WHERE slug = ?")
    .bind(trimmed, slug)
    .run();
  if ((result.meta?.changes ?? 0) === 0) {
    throw new Error(`Unknown agent: ${slug}`);
  }
  const updated = await getAgent(db, slug);
  if (!updated) throw new Error(`Unknown agent: ${slug}`);
  return updated;
}

export async function setAgentPrivate(
  db: D1Database,
  slug: string,
  isPrivate: boolean,
): Promise<AgentRecord> {
  await ensureSchema(db);
  const result = await db
    .prepare("UPDATE agents SET is_private = ? WHERE slug = ?")
    .bind(isPrivate ? 1 : 0, slug)
    .run();
  if ((result.meta?.changes ?? 0) === 0) {
    throw new Error(`Unknown agent: ${slug}`);
  }
  const updated = await getAgent(db, slug);
  if (!updated) throw new Error(`Unknown agent: ${slug}`);
  return updated;
}

export async function archiveAgent(
  db: D1Database,
  slug: string,
): Promise<AgentRecord> {
  await ensureSchema(db);
  const now = Date.now();
  const result = await db
    .prepare(
      "UPDATE agents SET archived_at = ? WHERE slug = ? AND archived_at IS NULL",
    )
    .bind(now, slug)
    .run();
  if ((result.meta?.changes ?? 0) === 0) {
    const existing = await getAgent(db, slug);
    if (!existing) throw new Error(`Unknown agent: ${slug}`);
    return existing;
  }
  const updated = await getAgent(db, slug);
  if (!updated) throw new Error(`Unknown agent: ${slug}`);
  return updated;
}

export async function unarchiveAgent(
  db: D1Database,
  slug: string,
): Promise<AgentRecord> {
  await ensureSchema(db);
  const result = await db
    .prepare("UPDATE agents SET archived_at = NULL WHERE slug = ?")
    .bind(slug)
    .run();
  if ((result.meta?.changes ?? 0) === 0) {
    throw new Error(`Unknown agent: ${slug}`);
  }
  const updated = await getAgent(db, slug);
  if (!updated) throw new Error(`Unknown agent: ${slug}`);
  return updated;
}

export async function readUserFile(
  db: D1Database,
): Promise<{ content: string; isDefault: boolean }> {
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT value FROM user_profile_kv WHERE key = ?")
    .bind(USER_FILE_KEY)
    .first<{ value: string }>();
  if (row) return { content: row.value, isDefault: false };
  return { content: USER_DEFAULT, isDefault: true };
}

export async function writeUserFile(
  db: D1Database,
  content: string,
): Promise<void> {
  await ensureSchema(db);
  await db
    .prepare(
      "INSERT INTO user_profile_kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(USER_FILE_KEY, content, Date.now())
    .run();
}

// ── User preferences ────────────────────────────────────────────────────────
// Stored in user_profile_kv under the `pref:` prefix. Only theme + show_thinking
// today; new preferences slot in by adding a key here. Reads coalesce into a
// single object so the client can rehydrate localStorage in one round trip.

const PREF_KEYS = [
  "theme_id",
  "color_scheme",
  "show_thinking",
  "ai_provider",
  "telegram_bot_token",
  "telegram_whitelist",
  "exa_api_key",
  "openrouter_api_key",
  "openrouter_model_id",
] as const;
type PrefKey = (typeof PREF_KEYS)[number];

type Preferences = Partial<Record<PrefKey, string>>;

const PREF_STORAGE_KEY = (key: PrefKey) => `pref:${key}`;

export type AiProviderRecord = {
  id: string;
  name: string;
  type: string;
  apiKey: string | null;
  endpoint: string | null;
  modelId: string | null;
  isDefault: boolean;
  createdAt: number;
};

type AiProviderRow = {
  id: string;
  name: string;
  type: string;
  api_key: string | null;
  endpoint: string | null;
  model_id: string | null;
  is_default: number;
  created_at: number;
};

function rowToAiProvider(row: AiProviderRow): AiProviderRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    apiKey: row.api_key,
    endpoint: row.endpoint,
    modelId: row.model_id,
    isDefault: row.is_default !== 0,
    createdAt: row.created_at,
  };
}

export async function listAiProviders(
  db: D1Database,
): Promise<AiProviderRecord[]> {
  await ensureSchema(db);
  const result = await db
    .prepare("SELECT * FROM ai_providers ORDER BY created_at")
    .all<AiProviderRow>();
  return (result.results ?? []).map(rowToAiProvider);
}

export async function getAiProvider(
  db: D1Database,
  id: string,
): Promise<AiProviderRecord | null> {
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT * FROM ai_providers WHERE id = ?")
    .bind(id)
    .first<AiProviderRow>();
  return row ? rowToAiProvider(row) : null;
}

export async function createAiProvider(
  db: D1Database,
  input: Omit<AiProviderRecord, "createdAt">,
): Promise<AiProviderRecord> {
  await ensureSchema(db);
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO ai_providers (id, name, type, api_key, endpoint, model_id, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      input.id,
      input.name,
      input.type,
      input.apiKey,
      input.endpoint,
      input.modelId,
      input.isDefault ? 1 : 0,
      now,
    )
    .run();
  return { ...input, createdAt: now };
}

export async function updateAiProvider(
  db: D1Database,
  id: string,
  input: Partial<Omit<AiProviderRecord, "id" | "createdAt">>,
): Promise<void> {
  await ensureSchema(db);
  const sets: string[] = [];
  const binds: any[] = [];
  if (input.name !== undefined) {
    sets.push("name = ?");
    binds.push(input.name);
  }
  if (input.type !== undefined) {
    sets.push("type = ?");
    binds.push(input.type);
  }
  if (input.apiKey !== undefined) {
    sets.push("api_key = ?");
    binds.push(input.apiKey);
  }
  if (input.endpoint !== undefined) {
    sets.push("endpoint = ?");
    binds.push(input.endpoint);
  }
  if (input.modelId !== undefined) {
    sets.push("model_id = ?");
    binds.push(input.modelId);
  }
  if (input.isDefault !== undefined) {
    sets.push("is_default = ?");
    binds.push(input.isDefault ? 1 : 0);
    if (input.isDefault) {
      await db.prepare("UPDATE ai_providers SET is_default = 0 WHERE id != ?").bind(id).run();
    }
  }

  if (sets.length === 0) return;
  binds.push(id);
  await db
    .prepare(`UPDATE ai_providers SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

export async function deleteAiProvider(
  db: D1Database,
  id: string,
): Promise<void> {
  await ensureSchema(db);
  await db.prepare("DELETE FROM ai_providers WHERE id = ?").bind(id).run();
}

export type SessionRecord = {
  id: string;
  agentSlug: string;
  title: string;
  createdAt: number;
};

export async function listSessions(
  db: D1Database,
  agentSlug: string,
): Promise<SessionRecord[]> {
  await ensureSchema(db);
  const result = await db
    .prepare(
      "SELECT * FROM sessions WHERE agent_slug = ? ORDER BY created_at DESC",
    )
    .bind(agentSlug)
    .all<{
      id: string;
      agent_slug: string;
      title: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    agentSlug: row.agent_slug,
    title: row.title,
    createdAt: row.created_at,
  }));
}

export async function createSession(
  db: D1Database,
  input: { id: string; agentSlug: string; title: string },
): Promise<SessionRecord> {
  await ensureSchema(db);
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO sessions (id, agent_slug, title, created_at) VALUES (?, ?, ?, ?)",
    )
    .bind(input.id, input.agentSlug, input.title, now)
    .run();
  return { ...input, createdAt: now };
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await ensureSchema(db);
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export async function renameSession(
  db: D1Database,
  id: string,
  title: string,
): Promise<void> {
  await ensureSchema(db);
  await db
    .prepare("UPDATE sessions SET title = ? WHERE id = ?")
    .bind(title, id)
    .run();
}

export async function getTelegramChat(
  db: D1Database,
  telegramChatId: string,
): Promise<{ agentSlug: string; sessionId: string } | null> {
  await ensureSchema(db);
  const row = await db
    .prepare(
      "SELECT agent_slug, session_id FROM telegram_chats WHERE telegram_chat_id = ?",
    )
    .bind(telegramChatId)
    .first<{ agent_slug: string; session_id: string }>();
  return row ? { agentSlug: row.agent_slug, sessionId: row.session_id } : null;
}

export async function setTelegramChat(
  db: D1Database,
  telegramChatId: string,
  agentSlug: string,
  sessionId: string,
): Promise<void> {
  await ensureSchema(db);
  await db
    .prepare(
      "INSERT INTO telegram_chats (telegram_chat_id, agent_slug, session_id) VALUES (?, ?, ?) ON CONFLICT (telegram_chat_id) DO UPDATE SET agent_slug = excluded.agent_slug, session_id = excluded.session_id",
    )
    .bind(telegramChatId, agentSlug, sessionId)
    .run();
}

export async function readPreferences(db: D1Database): Promise<Preferences> {
  await ensureSchema(db);
  const placeholders = PREF_KEYS.map(() => "?").join(", ");
  const sql = `SELECT key, value FROM user_profile_kv WHERE key IN (${placeholders})`;
  const result = await db
    .prepare(sql)
    .bind(...PREF_KEYS.map((k) => PREF_STORAGE_KEY(k)))
    .all<{ key: string; value: string }>();
  const out: Preferences = {};
  for (const row of result.results ?? []) {
    const stripped = row.key.replace(/^pref:/, "");
    if (isPrefKey(stripped)) {
      out[stripped] = row.value;
    }
  }
  return out;
}

/**
 * Read a configuration value from D1 preferences with fallback to env var.
 * This allows users to manage API keys and other configuration from the
 * Cloudflare dashboard (as secrets) or the app's own Settings UI (as D1 prefs).
 *
 * Order of precedence:
 *   1. D1 preference (set via app Settings UI)
 *   2. Environment variable (set via `wrangler secret put` or dashboard)
 *   3. Default value
 */
export async function readConfigWithEnvFallback(
  db: D1Database,
  prefKey: PrefKey,
  env: Cloudflare.Env,
  envKey: string,
  defaultValue = "",
): Promise<string> {
  const prefs = await readPreferences(db);
  const fromPref = prefs[prefKey];
  if (fromPref) return fromPref;

  const fromEnv = (env as unknown as Record<string, string>)[envKey];
  if (fromEnv) return fromEnv;

  return defaultValue;
}

export async function writePreference(
  db: D1Database,
  key: PrefKey,
  value: string,
): Promise<void> {
  await ensureSchema(db);
  await db
    .prepare(
      "INSERT INTO user_profile_kv (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    )
    .bind(PREF_STORAGE_KEY(key), value)
    .run();
}

export function isPrefKey(value: string): value is PrefKey {
  return (PREF_KEYS as readonly string[]).includes(value);
}

export async function getDefaultAiProvider(
  db: D1Database,
): Promise<AiProviderRecord | null> {
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT * FROM ai_providers WHERE is_default = 1 LIMIT 1")
    .first<AiProviderRow>();
  return row ? rowToAiProvider(row) : null;
}
