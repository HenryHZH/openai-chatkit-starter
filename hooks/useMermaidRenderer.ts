import { createElement, useCallback, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MermaidCard } from "@/components/MermaidCard";
import {
  MERMAID_CODE_SELECTORS,
  collectShadowRoots,
  getCodeLanguage,
  isMermaidDefinition,
  isMermaidLanguage,
  resolveMermaidContainer,
  selectChatKitHost,
} from "./mermaidDetection";

const isBrowser = typeof window !== "undefined";

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
        MERMAID_CODE_SELECTORS.flatMap((selector) =>
          Array.from(domRoot.querySelectorAll<HTMLElement>(selector))
        )
      );

      const visited = new Set<HTMLElement>();
      codeBlocks.forEach((block) => {
        if (visited.has(block)) return;
        visited.add(block);

        const container = resolveMermaidContainer(block);
        if (container.dataset.mermaidProcessed === "true") {
          return;
        }

        const definition =
          (block.textContent ?? container.textContent ?? "").trim();
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
