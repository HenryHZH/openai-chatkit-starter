import { useCallback, useEffect, useRef } from "react";

const isBrowser = typeof window !== "undefined";

const selectChatKitHost = () =>
  document.querySelector<HTMLElement & { shadowRoot?: ShadowRoot }>(
    "openai-chatkit"
  );

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

const MERMAID_CODE_SELECTOR =
  "pre code.language-mermaid, pre code.lang-mermaid, pre code[data-language=\"mermaid\"], pre code[data-lang=\"mermaid\"]";

let mermaidLoader: Promise<MermaidAPI | null> | null = null;

const collectShadowRoots = (root: Element | ShadowRoot) => {
  const roots = new Set<Element | ShadowRoot>([root]);
  const queue: Array<Element | ShadowRoot> = [root];

  while (queue.length) {
    const current = queue.pop();
    if (!current || !(current instanceof Element || current instanceof ShadowRoot)) {
      continue;
    }

    const children = Array.from(current.children ?? []);
    for (const child of children) {
      queue.push(child);

      if (child.shadowRoot) {
        roots.add(child.shadowRoot);
        queue.push(child.shadowRoot);
      }
    }
  }

  return Array.from(roots);
};

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

  mermaid.initialize({ startOnLoad: false });

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
  const renderRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    let observer: MutationObserver | null = null;
    const shadowObservers: MutationObserver[] = [];
    const observedShadowRoots = new Set<ShadowRoot | Element>();
    let fallbackObserver: MutationObserver | null = null;
    let cancelled = false;
    let observedRoot: Element | ShadowRoot | null = null;
    let shadowCheckId: number | null = null;
    const observers = new Set<MutationObserver>();

    const markNodesRendered = (nodes: Iterable<HTMLElement>) => {
      for (const node of nodes) {
        node.dataset.mermaidRendered = "true";
      }
    };

    const ensureNodesRendered = async (nodes: Iterable<HTMLElement>) => {
      await renderNodes(nodes);
      markNodesRendered(nodes);
    };

    const renderMermaid = async () => {
      const host = selectChatKitHost();
      if (!host || cancelled) return;

      const root = host.shadowRoot ?? host;
      const searchableRoots = collectShadowRoots(root);

      const codeBlocks = searchableRoots.flatMap((domRoot) =>
        Array.from(domRoot.querySelectorAll<HTMLElement>(MERMAID_CODE_SELECTOR))
      );
      codeBlocks.forEach((block) => {
        const container = block.closest<HTMLElement>("pre");
        if (!container || container.dataset.mermaidProcessed === "true") {
          return;
        }

        const definition = block.textContent?.trim() ?? "";
        const mermaidHost = document.createElement("div");
        mermaidHost.className = "mermaid";
        mermaidHost.textContent = definition;

        const sourceBlock = container.cloneNode(true) as HTMLElement;
        sourceBlock.style.display = "none";
        sourceBlock.dataset.mermaidSource = "true";

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.textContent = "查看源码";
        toggleButton.style.cssText =
          "align-self:flex-end;padding:4px 10px;font-size:12px;border-radius:8px;border:1px solid #cbd5e1;" +
          "background:#0ea5e9;color:white;cursor:pointer;";

        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-toggle-wrapper";
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.gap = "8px";
        wrapper.style.padding = "12px";
        wrapper.style.border = "1px solid #e2e8f0";
        wrapper.style.borderRadius = "12px";
        wrapper.style.background = "var(--mermaid-wrapper-bg, #f8fafc)";
        wrapper.dataset.mermaidView = "rendered";

        const setView = async (mode: "rendered" | "source") => {
          wrapper.dataset.mermaidView = mode;

          if (mode === "rendered") {
            sourceBlock.style.display = "none";
            mermaidHost.style.display = "";
            toggleButton.textContent = "查看源码";

            if (mermaidHost.dataset.mermaidRendered !== "true") {
              await ensureNodesRendered([mermaidHost]);
            }
          } else {
            sourceBlock.style.display = "";
            mermaidHost.style.display = "none";
            toggleButton.textContent = "查看图表";
          }
        };

        toggleButton.addEventListener("click", () => {
          const nextView =
            wrapper.dataset.mermaidView === "rendered" ? "source" : "rendered";

          void setView(nextView);
        });

        wrapper.append(toggleButton, mermaidHost, sourceBlock);

        container.dataset.mermaidProcessed = "true";
        container.replaceWith(wrapper);

        void setView("rendered");
      });

      const mermaidNodes = searchableRoots
        .flatMap((domRoot) =>
          Array.from(domRoot.querySelectorAll<HTMLElement>(".mermaid"))
        )
        .filter((node) => node.dataset.mermaidRendered !== "true");
      if (!mermaidNodes.length || cancelled) {
        return;
      }

      await ensureNodesRendered(mermaidNodes);
    };

    renderRef.current = () => renderMermaid();

    const attachShadowObservers = () => {
      const host = selectChatKitHost();
      if (!host || cancelled) return;

      const root = host.shadowRoot ?? host;
      const rootsToObserve = collectShadowRoots(root);

      rootsToObserve.forEach((rootToObserve) => {
        if (observedShadowRoots.has(rootToObserve)) {
          return;
        }

        const shadowObserver = new MutationObserver(() => {
          void renderMermaid();
          attachShadowObservers();
        });

        shadowObserver.observe(rootToObserve, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        observedShadowRoots.add(rootToObserve);
        shadowObservers.push(shadowObserver);
      });
    };

    const startShadowPolling = () => {
      if (shadowCheckId) return;

      shadowCheckId = window.setInterval(() => {
        const host = selectChatKitHost();
        if (!host?.shadowRoot || cancelled) {
          return;
        }

        const shadowRoot = host.shadowRoot;
        if (shadowRoot && shadowRoot !== observedRoot) {
          attachObserver();
        }
      }, 250);
    };

    const stopShadowPolling = () => {
      if (!shadowCheckId) return;

      window.clearInterval(shadowCheckId);
      shadowCheckId = null;
    };

    const attachObserver = () => {
      const host = selectChatKitHost();
      if (!host) return false;

      const root = host.shadowRoot ?? host;
      if (!root) return false;

      if (observedRoot === root) {
        return true;
      }

      observers.forEach((observer) => observer.disconnect());
      observers.clear();

      observer = new MutationObserver(() => {
        void renderMermaid();
        attachShadowObservers();

        if (host.shadowRoot && host.shadowRoot !== observedRoot) {
          attachObserver();
        }
      });
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      observedRoot = root;

      attachShadowObservers();
      void renderMermaid();

      if (!host.shadowRoot) {
        startShadowPolling();
      }

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
      shadowObservers.forEach((shadowObserver) => shadowObserver.disconnect());
      fallbackObserver?.disconnect();
      stopShadowPolling();
      renderRef.current = async () => {};
    };
  }, [resetKey]);

  return useCallback(() => renderRef.current(), []);
}

export default useMermaidRenderer;
