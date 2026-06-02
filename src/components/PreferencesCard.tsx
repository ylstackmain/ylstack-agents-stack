import {
  AI_PROVIDERS,
  isAiProvider,
} from "../lib/ai-providers";
import { useState } from "react";
import {
  useShowThinking,
  useAiProvider,
  useTelegramBotToken,
  useTelegramWhitelist,
} from "../lib/preferences";
import { useProviders } from "../lib/queries";
import { setupTelegramWebhook, testTelegramBot } from "../lib/api-client";
import { alertDialog } from "./ui/dialog";

const BUILTIN_PROVIDER_LABELS: Record<string, string> = {
  kimi: "Kimi K2.6 (Workers AI)",
  "pi-local": "Pi Proxy (local)",
  "pi-prod": "Pi Proxy (prod)",
};

export default function PreferencesCard() {
  const [showThinking, setShowThinking] = useShowThinking();
  const [aiProvider, setAiProvider] = useAiProvider();
  const [telegramToken, setTelegramToken] = useTelegramBotToken();
  const [telegramWhitelist, setTelegramWhitelist] = useTelegramWhitelist();
  const { data: managedProviders = [] } = useProviders();

  const [busy, setBusy] = useState(false);

  async function handleSetupWebhook() {
    if (!telegramToken) {
      void alertDialog({
        title: "Token required",
        message: "Please enter your Telegram Bot API Token first.",
      });
      return;
    }
    setBusy(true);
    try {
      const data = await setupTelegramWebhook();
      if (data.ok) {
        void alertDialog({
          title: "Success",
          message: "Telegram webhook has been set up successfully.",
        });
      } else {
        throw new Error(data.description || "Failed to set up webhook");
      }
    } catch (err) {
      void alertDialog({
        title: "Setup failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleTestBot() {
    if (!telegramToken) {
      void alertDialog({
        title: "Token required",
        message: "Please enter your Telegram Bot API Token first.",
      });
      return;
    }
    setBusy(true);
    try {
      const data = await testTelegramBot();
      if (data.ok) {
        void alertDialog({
          title: "Bot is active",
          message: `Connected as @${data.result.username} (${data.result.first_name})`,
        });
      } else {
        throw new Error(data.description || "Failed to test bot");
      }
    } catch (err) {
      void alertDialog({
        title: "Test failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  const isManagedProvider = (provider: string): boolean => {
    return provider.includes("-") && provider.length > 20;
  };

  const getProviderLabel = (provider: string): string => {
    if (isManagedProvider(provider)) {
      return `Custom: ${provider.slice(0, 8)}...`;
    }
    return BUILTIN_PROVIDER_LABELS[provider] || provider;
  };

  return (
    <div className="space-y-6">
      <section className="card card-compact border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="text-base font-semibold">General Preferences</h2>

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Show thinking</span>
              <span className="mt-1 block text-xs text-base-content/70">
                Expand reasoning blocks by default.
              </span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary flex-shrink-0"
              checked={showThinking}
              onChange={(e) => {
                setShowThinking(e.target.checked);
              }}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="block text-sm font-medium">Model</span>
            <select
              className="select select-bordered select-sm"
              value={aiProvider}
              onChange={(e) => {
                const next = e.target.value;
                if (isAiProvider(next)) setAiProvider(next);
              }}
            >
              <optgroup label="Built-in Providers">
                {AI_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {BUILTIN_PROVIDER_LABELS[p] || p}
                  </option>
                ))}
              </optgroup>
              {managedProviders.length > 0 && (
                <optgroup label="Custom Providers">
                  {managedProviders.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <span className="text-[10px] opacity-50">
              Current: {getProviderLabel(aiProvider)}
            </span>
          </label>
        </div>
      </section>

      <section className="card card-compact border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="text-base font-semibold">Telegram Integration</h2>
          <p className="text-xs text-base-content/60">
            Configure your Telegram bot to interact with agents from anywhere.
          </p>

          <label className="flex flex-col gap-2">
            <span className="block text-sm font-medium">Bot API Token</span>
            <input
              type="password"
              className="input input-bordered input-sm"
              placeholder="1234567890:ABC..."
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="block text-sm font-medium">
              Whitelisted Chat IDs
            </span>
            <input
              type="text"
              className="input input-bordered input-sm"
              placeholder="12345678, -987654321"
              value={telegramWhitelist}
              onChange={(e) => setTelegramWhitelist(e.target.value)}
            />
            <span className="text-[10px] opacity-50">
              Comma-separated IDs. Leave empty to allow any chat (not
              recommended).
            </span>
          </label>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleSetupWebhook}
              className="btn btn-primary btn-sm flex-1"
            >
              {busy ? "Setting up..." : "Save & Set Webhook"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleTestBot}
              className="btn btn-ghost btn-sm"
            >
              Test Bot
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}