import { createElement, useCallback, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MermaidCard } from "@/components/MermaidCard";

const isBrowser = typeof window !== "undefined";

const selectChatKitHost = () =>
  document.querySelector<HTMLElement & { shadowRoot?: ShadowRoot }>(
    "openai-chatkit"
  );

const MERMAID_LANGUAGE_HINTS = new Set([
  "mermaid",
  "flowchart",
  "graph",
  "sequence",
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "journey",
  "gantt",
  "pie",
  "quadrantchart",
  "requirementdiagram",
  "gitgraph",
  "mindmap",
  "timeline",
  "sankey",
  "sankey-beta",
  "xychart-beta",
]);

const MERMAID_DEFINITION_PATTERNS = [
  /^\s*(graph|flowchart)\s+(TB|TD|LR|RL|BT)\b/i,
  /^\s*sequenceDiagram\b/i,
  /^\s*classDiagram\b/i,
  /^\s*stateDiagram(-v2)?\b/i,
  /^\s*erDiagram\b/i,
  /^\s*journey\b/i,
  /^\s*gantt\b/i,
  /^\s*pie\b/i,
  /^\s*quadrantChart\b/i,
  /^\s*requirementDiagram\b/i,
  /^\s*gitGraph\b/i,
  /^\s*mindmap\b/i,
  /^\s*sankey(-beta)?\b/i,
  /^\s*timeline\b/i,
  /^\s*xychart-beta\b/i,
];

const ALL_CODE_SELECTOR = "pre code";

const getCodeLanguage = (block: HTMLElement) => {
  const dataLanguage =
    (block.dataset.language ?? block.dataset.lang ?? "").toLowerCase();
  if (dataLanguage) return dataLanguage;

  const classNames = block.className ?? "";
  const match = classNames.match(/language-([a-z0-9+-]+)/i);
  if (match) {
    return match[1].toLowerCase();
  }

  return "";
};

const isMermaidLanguage = (language: string) =>
  MERMAID_LANGUAGE_HINTS.has(language.toLowerCase());

const isMermaidDefinition = (definition: string) =>
  MERMAID_DEFINITION_PATTERNS.some((pattern) => pattern.test(definition));

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

    const mermaidRoots = new Set<Root>();

    const renderMermaid = async () => {
      const host = selectChatKitHost();
      if (!host || cancelled) return;

      const root = host.shadowRoot ?? host;
      const searchableRoots = collectShadowRoots(root);

      const codeBlocks = searchableRoots.flatMap((domRoot) =>
        Array.from(domRoot.querySelectorAll<HTMLElement>(ALL_CODE_SELECTOR))
      );
      codeBlocks.forEach((block) => {
        const container = block.closest<HTMLElement>("pre");
        if (!container || container.dataset.mermaidProcessed === "true") {
          return;
        }

        const definition = block.textContent?.trim() ?? "";
        const language = getCodeLanguage(block);

        if (!definition) return;
        if (!isMermaidLanguage(language) && !isMermaidDefinition(definition)) {
          return;
        }

        const mountNode = document.createElement("div");
        container.dataset.mermaidProcessed = "true";
        container.replaceWith(mountNode);

        const root = createRoot(mountNode);
        mermaidRoots.add(root);
        root.render(
          createElement(MermaidCard, {
            definition,
          })
        );
      });
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
      mermaidRoots.forEach((root) => root.unmount());
      mermaidRoots.clear();
      renderRef.current = async () => {};
    };
  }, [resetKey]);

  return useCallback(() => renderRef.current(), []);
}

export default useMermaidRenderer;
