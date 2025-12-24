import { useEffect } from "react";

const isBrowser = typeof window !== "undefined";

const selectChatKitHost = () =>
  document.querySelector<HTMLElement & { shadowRoot?: ShadowRoot }>(
    "openai-chatkit"
  );

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

let mermaidLoader: Promise<MermaidAPI | null> | null = null;

type MermaidAPI = {
  initialize: (config: { startOnLoad: boolean; securityLevel?: string }) => void;
  run?: (options: { nodes: Iterable<Element> }) => Promise<unknown> | unknown;
  init?: (config: unknown, nodes: Iterable<Element>) => void;
};

const loadMermaid = () => {
  if (!isBrowser) return Promise.resolve(null);

  if (mermaidLoader) {
    return mermaidLoader;
  }

  mermaidLoader = new Promise<MermaidAPI | null>((resolve) => {
    const existingMermaid = (window as unknown as { mermaid?: MermaidAPI })
      ?.mermaid;
    if (existingMermaid) {
      resolve(existingMermaid);
      return;
    }

    const script = document.createElement("script");
    script.src = MERMAID_CDN;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.onload = () => {
      resolve((window as unknown as { mermaid?: MermaidAPI }).mermaid ?? null);
    };
    script.onerror = (event) => {
      console.error("Failed to load mermaid script", event);
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return mermaidLoader;
};

const renderNodes = async (nodes: Iterable<Element>) => {
  const mermaid = await loadMermaid();
  if (!mermaid) return;

  mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

  try {
    if (typeof mermaid.run === "function") {
      await mermaid.run({ nodes });
    } else if (typeof mermaid.init === "function") {
      mermaid.init(undefined, nodes);
    }
  } catch (error) {
    console.error("Failed to render mermaid diagram", error);
  }
};

export function useMermaidRenderer(resetKey?: unknown) {
  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    let observer: MutationObserver | null = null;
    let fallbackObserver: MutationObserver | null = null;
    let cancelled = false;

    const renderMermaid = async () => {
      const host = selectChatKitHost();
      if (!host || cancelled) return;

      const root = host.shadowRoot ?? host;

      const codeBlocks = root.querySelectorAll<HTMLDivElement>("code.language-mermaid");
      codeBlocks.forEach((block) => {
        const container = block.closest<HTMLElement>("pre");
        if (!container || container.dataset.mermaidProcessed === "true") {
          return;
        }

        const definition = block.textContent?.trim() ?? "";
        const mermaidHost = document.createElement("div");
        mermaidHost.className = "mermaid";
        mermaidHost.textContent = definition;
        container.dataset.mermaidProcessed = "true";
        container.replaceWith(mermaidHost);
      });

      const mermaidNodes = root.querySelectorAll<HTMLElement>(".mermaid");
      if (!mermaidNodes.length || cancelled) {
        return;
      }

      await renderNodes(mermaidNodes);
    };

    const attachObserver = () => {
      const host = selectChatKitHost();
      if (!host) return false;

      const root = host.shadowRoot ?? host;
      observer = new MutationObserver(() => {
        void renderMermaid();
      });
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      void renderMermaid();
      return true;
    };

    const attachFallbackObserver = () => {
      fallbackObserver = new MutationObserver(() => {
        if (attachObserver()) {
          fallbackObserver?.disconnect();
          fallbackObserver = null;
        }
      });

      fallbackObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    };

    if (!attachObserver()) {
      attachFallbackObserver();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      fallbackObserver?.disconnect();
    };
  }, [resetKey]);
}

export default useMermaidRenderer;
