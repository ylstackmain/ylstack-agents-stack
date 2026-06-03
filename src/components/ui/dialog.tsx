import { useEffect, useRef, useState } from "react";

// App-native replacement for window.confirm / window.alert / prompt.
//
// Usage:
//   const ok = await confirmDialog({ message: "Delete this?", tone: "danger" });
//   if (!ok) return;
//
//   const name = await promptDialog({
//     title: "Agent Name",
//     placeholder: "research-agent",
//     fields: [{ label: "Display Name", name: "displayName", required: true }],
//   });
//   if (!name) return;
//
// Mount <DialogHost/> once at the app root. The imperative API publishes
// requests through a module-level listener so call sites don't have to thread
// a context or hook around — same ergonomics as window.confirm.
type Tone = "neutral" | "danger";

type ConfirmRequest = {
  kind: "confirm";
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  resolve: (value: boolean) => void;
};

type PromptField = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

type PromptRequest = {
  kind: "prompt";
  title: string;
  message?: string;
  submitLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  resolve: (value: Record<string, string> | null) => void;
  fields: PromptField[];
};

type AlertRequest = {
  kind: "alert";
  title?: string;
  message: string;
  tone?: Tone;
  resolve: () => void;
};

type DialogRequest = ConfirmRequest | PromptRequest | AlertRequest;

let listener: ((req: DialogRequest) => void) | null = null;

function setListener(fn: ((req: DialogRequest) => void) | null) {
  listener = fn;
}

export function confirmDialog(opts: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      resolve(typeof window !== "undefined" && window.confirm(opts.message));
      return;
    }
    listener({ kind: "confirm", ...opts, resolve });
  });
}

export function promptDialog(opts: {
  title: string;
  message?: string;
  submitLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  fields: PromptField[];
}): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    if (!listener) {
      // Degrade to native prompt for the first field if no host
      if (typeof window !== "undefined" && opts.fields[0]?.name) {
        const value = window.prompt(opts.message ?? opts.title) ?? "";
        resolve({ [opts.fields[0].name]: value });
        return;
      }
      resolve(null);
      return;
    }
    listener({ kind: "prompt", ...opts, resolve });
  });
}

export function alertDialog(opts: {
  title?: string;
  message: string;
  tone?: Tone;
}): Promise<void> {
  return new Promise((resolve) => {
    if (!listener) {
      if (typeof window !== "undefined") window.alert(opts.message);
      resolve();
      return;
    }
    listener({
      kind: "alert",
      ...opts,
      resolve: () => {
        resolve();
      },
    });
  });
}

export function DialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setListener((req) => {
      setRequest(req);
      // Initialize field values
      if (req.kind === "prompt") {
        const init: Record<string, string> = {};
        for (const f of req.fields) {
          init[f.name] = "";
        }
        setFieldValues(init);
      }
    });
    return () => {
      setListener(null);
    };
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (request && !el.open) el.showModal();
  }, [request]);

  function settle(result: boolean) {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(result);
    else if (request.kind === "prompt") {
      request.resolve(result ? fieldValues : null);
    } else request.resolve();
    dialogRef.current?.close();
    setRequest(null);
  }

  if (!request) return null;
  const tone = request.tone ?? "neutral";
  const confirmBtnClass =
    tone === "danger" ? "btn btn-error" : "btn btn-primary";

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={() => {
        settle(false);
      }}
    >
      <div className="modal-box max-w-md border border-base-300 shadow-2xl">
        {request.title ? (
          <h3 className="text-base font-semibold">{request.title}</h3>
        ) : null}
        {request.kind === "prompt" && request.fields ? (
          <div className="mt-4 space-y-3">
            {request.fields.map((f) => (
              <label key={f.name} className="block">
                <span className="block text-xs font-medium mb-1">{f.label}</span>
                <input
                  className="input input-bordered input-sm w-full"
                  placeholder={f.placeholder}
                  value={fieldValues[f.name] ?? ""}
                  onChange={(e) =>
                    setFieldValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  required={f.required}
                />
              </label>
            ))}
          </div>
        ) : (
          <p
            className={`whitespace-pre-line text-sm text-base-content/75 ${
              request.title ? "mt-2" : ""
            }`}
          >
            {request.message}
          </p>
        )}
        <div className="modal-action mt-5">
          {request.kind === "confirm" || request.kind === "prompt" ? (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  settle(false);
                }}
              >
                {request.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`${confirmBtnClass} btn-sm`}
                onClick={() => {
                  // Validate required fields for prompt
                  if (
                    request.kind === "prompt" &&
                    request.fields.some(
                      (f) => f.required && !fieldValues[f.name],
                    )
                  ) {
                    return;
                  }
                  settle(true);
                }}
                autoFocus
              >
                {request.kind === "prompt"
                  ? request.submitLabel ?? "Create"
                  : request.confirmLabel ?? "Confirm"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                settle(true);
              }}
              autoFocus
            >
              OK
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-base-300/60">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
