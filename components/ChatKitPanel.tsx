"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import {
  STARTER_PROMPTS,
  PLACEHOLDER_INPUT,
  GREETING,
  CREATE_SESSION_ENDPOINT,
  WORKFLOW_ID,
  CHATKIT_SCRIPT_URL,
  getThemeConfig,
} from "@/lib/config";
import { ErrorOverlay } from "./ErrorOverlay";
import type { ColorScheme } from "@/hooks/useColorScheme";

type ChatKitPanelProps = {
  theme: ColorScheme;
  onThemeRequest?: (scheme: ColorScheme) => void;
};

type ScriptStatus = "idle" | "loading" | "ready" | "error";

type ErrorState = {
  script: string | null;
  session: string | null;
  integration: string | null;
  retryable: boolean;
};

const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";
const createInitialErrors = (): ErrorState => ({
  script: null,
  session: null,
  integration: null,
  retryable: false,
});

export function ChatKitPanel({ theme, onThemeRequest }: ChatKitPanelProps) {
  const isWorkflowConfigured = Boolean(
    WORKFLOW_ID && !WORKFLOW_ID.startsWith("wf_replace")
  );

  if (!isWorkflowConfigured) {
    return (
      <div className="relative flex h-[80vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-colors dark:bg-slate-900">
        <ErrorOverlay
          error={null}
          fallbackMessage="Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your environment to enable the assistant."
          onRetry={null}
        />
      </div>
    );
  }

  return (
    <ConfiguredChatKitPanel theme={theme} onThemeRequest={onThemeRequest} />
  );
}

function ConfiguredChatKitPanel({
  theme,
  onThemeRequest,
}: ChatKitPanelProps) {
  const [errors, setErrors] = useState<ErrorState>(() => createInitialErrors());
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const isMountedRef = useRef(true);
  const [widgetInstanceKey, setWidgetInstanceKey] = useState(0);
  const {
    status: scriptStatus,
    error: scriptError,
    retry: retryScript,
  } = useChatKitScriptLoader(CHATKIT_SCRIPT_URL);

  const setErrorState = useCallback((updates: Partial<ErrorState>) => {
    setErrors((current) => ({ ...current, ...updates }));
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;
    if (scriptStatus === "error") {
      setIsInitializingSession(false);
      setErrorState({ script: scriptError ?? "", retryable: true });
      return;
    }

    if (scriptStatus === "ready") {
      setErrorState({ script: null, retryable: false });
    }
  }, [scriptStatus, scriptError, setErrorState]);

  const handleResetChat = useCallback(() => {
    setIsInitializingSession(true);
    setErrors(createInitialErrors());
    retryScript();
    setWidgetInstanceKey((prev) => prev + 1);
  }, [retryScript]);

  const getClientSecret = useCallback(
    async (currentSecret: string | null) => {
      if (isDev) {
        console.info("[ChatKitPanel] getClientSecret invoked", {
          currentSecretPresent: Boolean(currentSecret),
          workflowId: WORKFLOW_ID,
          endpoint: CREATE_SESSION_ENDPOINT,
        });
      }

      if (isMountedRef.current) {
        if (!currentSecret) {
          setIsInitializingSession(true);
        }
        setErrorState({ session: null, integration: null, retryable: false });
      }

      try {
        const response = await fetch(CREATE_SESSION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflow: { id: WORKFLOW_ID },
          }),
        });

        const raw = await response.text();

        if (isDev) {
          console.info("[ChatKitPanel] createSession response", {
            status: response.status,
            ok: response.ok,
            bodyPreview: raw.slice(0, 1600),
          });
        }

        let data: Record<string, unknown> = {};
        if (raw) {
          try {
            data = JSON.parse(raw) as Record<string, unknown>;
          } catch (parseError) {
            console.error("Failed to parse create-session response", parseError);
          }
        }

        if (!response.ok) {
          const detail = extractErrorDetail(data, response.statusText);
          console.error("Create session request failed", {
            status: response.status,
            body: data,
          });
          throw new Error(detail);
        }

        const clientSecret = data?.client_secret as string | undefined;
        if (!clientSecret) {
          throw new Error("Missing client secret in response");
        }

        if (isMountedRef.current) {
          setErrorState({ session: null, integration: null });
        }

        return clientSecret;
      } catch (error) {
        console.error("Failed to create ChatKit session", error);
        const detail =
          error instanceof Error
            ? error.message
            : "Unable to start ChatKit session.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: true });
        }
        throw error instanceof Error ? error : new Error(detail);
      } finally {
        if (isMountedRef.current && !currentSecret) {
          setIsInitializingSession(false);
        }
      }
    },
    [setErrorState]
  );

  const themeConfig = useMemo(
    () => ({
      colorScheme: theme,
      ...getThemeConfig(theme),
    }),
    [theme]
  );

  const startScreenConfig = useMemo(
    () => ({
      greeting: GREETING,
      prompts: STARTER_PROMPTS,
    }),
    []
  );

  const composerConfig = useMemo(
    () => ({
      placeholder: PLACEHOLDER_INPUT,
    }),
    []
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: themeConfig,
    startScreen: startScreenConfig,
    composer: composerConfig,
    onClientTool: async (invocation: {
      name: string;
      params: Record<string, unknown>;
    }) => {
      if (invocation.name === "switch_theme") {
        const requested = invocation.params.theme;
        if (requested === "light" || requested === "dark") {
          onThemeRequest?.(requested);
          return { success: true };
        }
      }
      return { success: false };
    },
    onResponseStart: () => {
      setErrorState({ integration: null, retryable: false });
    },
    onThreadChange: () => {
      setErrorState({ integration: null });
    },
    onLog: (entry) => {
      if (isDev) {
        console.info("[ChatKitPanel] chatkit.log", entry);
      }
    },
    onError: ({ error }: { error: unknown }) => {
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unknown ChatKit error";
      console.error("ChatKit error", error);
      setErrorState({ integration: detail, retryable: false });
    },
  });

  const activeError = errors.session ?? errors.integration;
  const blockingError = errors.script ?? scriptError ?? activeError;

  if (isDev) {
    console.debug("[ChatKitPanel] render state", {
      isInitializingSession,
      hasControl: Boolean(chatkit.control),
      scriptStatus,
      hasError: Boolean(blockingError),
      workflowId: WORKFLOW_ID,
    });
  }

  return (
    <div className="relative flex min-h-[80vh] w-full flex-1 flex-col overflow-hidden rounded-2xl bg-white pb-4 shadow-sm transition-colors dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/80 px-4 py-3 text-slate-700 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70 dark:text-slate-200">
        <div>
          <p className="text-sm font-semibold">Chat</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Talk to your Agent Builder workflow via ChatKit.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          onClick={handleResetChat}
        >
          Restart
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        <ChatKit
          key={widgetInstanceKey}
          control={chatkit.control}
          className={
            blockingError || isInitializingSession
              ? "pointer-events-none opacity-0"
              : "block h-full w-full"
          }
        />
        <ErrorOverlay
          error={blockingError}
          fallbackMessage={
            blockingError || !isInitializingSession
              ? null
              : scriptStatus === "loading"
                ? "Loading ChatKit resources..."
                : "Starting a session..."
          }
          onRetry={blockingError && errors.retryable ? handleResetChat : null}
          retryLabel="Restart chat"
        />
      </div>
    </div>
  );
}

function useChatKitScriptLoader(url: string): {
  status: ScriptStatus;
  error: string | null;
  retry: () => void;
} {
  const [status, setStatus] = useState<ScriptStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    let cancelled = false;
    let scriptEl = document.querySelector<HTMLScriptElement>(
      "script[data-chatkit-loader]"
    );

    const handleReady = () => {
      if (cancelled) return;
      setStatus("ready");
      setError(null);
    };

    const handleError = (event: Event) => {
      if (cancelled) return;
      console.error("Failed to load ChatKit script", event);
      setStatus("error");
      setError("Unable to load ChatKit resources. Please try again.");
    };

    const handleLoaded = () => {
      if (cancelled) return;
      window.customElements
        ?.whenDefined("openai-chatkit")
        .then(handleReady)
        .catch((error) => {
          console.error("Failed to register ChatKit element", error);
          handleError(
            new CustomEvent("chatkit-script-error", {
              detail: "ChatKit web component not available after load.",
            })
          );
        });
    };

    const removeScript = () => {
      scriptEl?.removeEventListener("load", handleLoaded);
      scriptEl?.removeEventListener("error", handleError);
      if (
        scriptEl?.dataset.chatkitLoader &&
        scriptEl.getAttribute("src") !== null
      ) {
        scriptEl.remove();
        scriptEl = null;
      }
    };

    setStatus("loading");
    setError(null);

    if (window.customElements?.get("openai-chatkit")) {
      handleReady();
      return undefined;
    }

    if (scriptEl && scriptEl.src !== url) {
      removeScript();
    }

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.src = url;
      scriptEl.async = true;
      scriptEl.dataset.chatkitLoader = "true";
      document.head.appendChild(scriptEl);
    }

    scriptEl.addEventListener("load", handleLoaded);
    scriptEl.addEventListener("error", handleError);

    const definitionTimeout = window.setTimeout(() => {
      if (cancelled) return;
      if (!window.customElements?.get("openai-chatkit")) {
        handleError(
          new CustomEvent("chatkit-script-error", {
            detail: "ChatKit web component not available after load.",
          })
        );
      }
    }, 5000);

    return () => {
      cancelled = true;
      scriptEl?.removeEventListener("load", handleLoaded);
      scriptEl?.removeEventListener("error", handleError);
      window.clearTimeout(definitionTimeout);
    };
  }, [url, attempt]);

  const retry = useCallback(() => {
    if (isBrowser) {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-chatkit-loader]"
      );
      if (existing) {
        existing.remove();
      }
    }
    setAttempt((current) => current + 1);
  }, []);

  return { status, error, retry };
}

function extractErrorDetail(
  payload: Record<string, unknown> | undefined,
  fallback: string
): string {
  if (!payload) {
    return fallback;
  }

  const error = payload.error;
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details === "object" && "error" in details) {
    const nestedError = (details as { error?: unknown }).error;
    if (typeof nestedError === "string") {
      return nestedError;
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      typeof (nestedError as { message?: unknown }).message === "string"
    ) {
      return (nestedError as { message: string }).message;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}
