import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAgents } from "../lib/agents";
import { AgentSelector } from "../components/chat/agent-panel-sections";

// Land on the user's top agent. The dropdown is ordered by `created_at`, so
// `agents[0]` matches what they'd see at the top of the picker. If they've
// archived everything, render a tiny empty state — there's nothing to redirect
// to and forcing a slug would 404.
export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const agents = useAgents();
  const [showCreate, setShowCreate] = useState(false);
  const first = agents[0];

  if (first) {
    return <Navigate to="/agent/$slug" params={{ slug: first.slug }} replace />;
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">No agents yet</h1>
      <p className="mt-2 mb-6 text-sm text-base-content/65">
        Create your first agent to get started with ylstack-agents-stack.
      </p>

      {showCreate ? (
        <div className="w-full max-w-xs">
          <AgentSelector />
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          Create First Agent
        </button>
      )}
    </main>
  );
}
