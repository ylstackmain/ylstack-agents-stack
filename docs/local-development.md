# Local development

The `.env` file drives `pnpm dev` — Wrangler reads bindings from `wrangler.jsonc` and injects every required binding, var, and secret into the local Worker.

Minimum `.env` for local dev:

```
EXA_API_KEY=your-exa-key-here
```

`vite dev` on `localhost` automatically bypasses the Cloudflare Access gate — that branch is gated on Vite's build-time `import.meta.env.DEV` flag in `src/server.ts`, so it's compiled out of the production bundle. No env var, no risk of leaking the bypass to prod.

The `@cloudflare/vite-plugin` "remote bindings" feature is disabled in `vite.config.ts` (`remoteBindings: false`). It would otherwise try to proxy any binding that has no local emulation — most relevantly the `AI` binding for Workers AI — through the deployed worker at `ylstack-agents-stack.<account>.workers.dev`, which fails in a fresh shell because that worker is behind Cloudflare Access. Practical consequence: **Workers AI doesn't work in `pnpm dev`.** Use the pi-local path below, or pick a different model provider in Settings → Preferences. If you need Workers AI locally, either generate a Cloudflare Access service token and export `CLOUDFLARE_ACCESS_CLIENT_ID` / `CLOUDFLARE_ACCESS_CLIENT_SECRET`, or temporarily flip `remoteBindings` back to `true`.

Then:

```bash
pnpm dev
```

Secrets (like `EXA_API_KEY`) are set via `npx wrangler secret put` for deployed workers. For local development, they can be defined in `.env` or set via `wrangler secret put` in local mode.

## Optional: ChatGPT subscription locally (pi-local)

To use your ChatGPT Plus/Pro subscription locally instead of Kimi — no VPC, no tunnel, just a sibling proxy on loopback. From `aisdk-pi-proxy/`:

```bash
npm install
npx @mariozechner/pi-ai login openai-codex   # once, writes auth.json
npm run dev                                  # listens on 127.0.0.1:8788
```

Then in the running app at `/settings` → **Preferences** → **Model**, pick **Pi proxy — local dev**. OpenAI currently allows third-party harnesses to use ChatGPT subscriptions for personal use, but that policy could change at any time — treat this path as best-effort. See [`aisdk-pi-proxy/README.md`](../aisdk-pi-proxy/README.md) for more.
