import { useEffect, useState } from "react";
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

export function useMermaidSourceSync() {
  const [definition, setDefinition] = useState<string>("");

  useEffect(() => {
    if (!isBrowser) return undefined;

    let cancelled = false;
    let lastSynced = "";

    const scanForMermaid = () => {
      const host = selectChatKitHost();
      const root = host?.shadowRoot ?? host;

      if (!root || cancelled) return;

      const searchableRoots = collectShadowRoots(root);
      const visited = new Set<HTMLElement>();

      for (const domRoot of searchableRoots) {
        for (const selector of MERMAID_CODE_SELECTORS) {
          const blocks = domRoot.querySelectorAll<HTMLElement>(selector);

          for (const block of blocks) {
            if (visited.has(block)) continue;
            visited.add(block);

            const container = resolveMermaidContainer(block);
            const textContent =
              (block.textContent ?? container.textContent ?? "").trim();
            const language = getCodeLanguage(block);

            if (!textContent) continue;
            if (
              !isMermaidLanguage(language) &&
              !isMermaidDefinition(textContent)
            ) {
              continue;
            }

            if (textContent !== lastSynced) {
              lastSynced = textContent;
              setDefinition(textContent);
            }

            return; // only pick the first detected block
          }
        }
      }
    };

    const intervalId = window.setInterval(scanForMermaid, 1200);
    scanForMermaid();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return definition;
}

export default useMermaidSourceSync;
