import {
  ClientOnly,
  HeadContent,
  Scripts,
  createRootRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { useAgent } from "agents/react";
import CommandPalette from "../components/CommandPalette";
import ExaSetupWarning from "../components/ExaSetupWarning";
import Header from "../components/Header";
import AgentPanel from "../components/chat/AgentPanel";
import { DialogHost } from "../components/ui/dialog";
import {
  agentSlugFromPath,
  useAgentsQuery,
  useCurrentAgentSlug,
} from "../lib/agents";
import { hydratePreferencesFromServer } from "../lib/preferences-sync";
import { queryClient } from "../lib/query-client";
import { THEMES } from "../lib/theme";

import appCss from "../styles.css?url";

// Inline preload — runs before React renders to avoid a flash of the default
// theme. Keep in sync with src/lib/theme.ts (storage keys + naming convention).
// The allowlist is generated at build time from THEMES so a removed/renamed
// theme in localStorage falls back to ylstack-agents-stack instead of setting a
// data-theme that has no matching CSS rule.
const VALID_IDS_JSON = JSON.stringify(THEMES.map((t) => t.id));
const THEME_INIT_SCRIPT = `(function(){try{var valid=${VALID_IDS_JSON};var id=window.localStorage.getItem('ylstack-agents-stack:theme-id');if(!id||valid.indexOf(id)===-1)id='ylstack-agents-stack';var scheme=window.localStorage.getItem('ylstack-agents-stack:color-scheme');if(scheme!=='light'&&scheme!=='dark')scheme='system';var resolved=scheme==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):scheme;var root=document.documentElement;root.setAttribute('data-theme',id+'-'+resolved);root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "YLStack Agent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  // Pull any device-spanning preference overrides down into localStorage so
  // the existing localStorage-backed hooks pick them up. Idempotent.
  useEffect(() => {
    void hydratePreferencesFromServer();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-base-200 text-base-content antialiased">
        <QueryClientProvider client={queryClient}>
          <div className="flex min-h-screen flex-col md:min-h-0 md:h-screen">
            <AgentRouteGuard />
            <Header />
            <div className="flex flex-1 min-h-0">
              <ClientOnly
                fallback={<div className="md:w-72 shrink-0 hidden md:block" />}
              >
                <ClientOnlyAgentPanel />
              </ClientOnly>
              <div className="flex-1 md:h-full md:overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
          <DialogHost />
          <ExaSetupWarning />
          <CommandPalette />
          {import.meta.env.DEV ? (
            <TanStackDevtools
              config={{ position: "bottom-right" }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          ) : null}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function ClientOnlyAgentPanel() {
  const slug = useCurrentAgentSlug();
  const protocol =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss"
      : "ws";
  const agent = useAgent({
    agent: "DownyAgent",
    name: `${slug}:default`,
    protocol,
  });

  // We only want the panel on desktop or when mobile is triggered.
  // The panel itself handles desktop collapse and mobile drawer logic.
  return <AgentPanel agent={agent} />;
}

function AgentRouteGuard() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentSlug = agentSlugFromPath(pathname);
  const agents = useAgentsQuery();

  useEffect(() => {
    if (currentSlug === null || agents.status !== "success") return;
    if (agents.data.some((a) => a.slug === currentSlug)) return;

    const fallback = agents.data[0]?.slug;
    if (fallback) {
      void navigate({
        to: "/agent/$slug",
        params: { slug: fallback },
        replace: true,
      });
    } else {
      void navigate({ to: "/", replace: true });
    }
  }, [agents.data, agents.status, currentSlug, navigate]);

  return null;
}
