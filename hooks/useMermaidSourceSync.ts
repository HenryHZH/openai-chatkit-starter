import { useCallback, useRef, useState } from "react";
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
  const lastSyncedRef = useRef("");

  const syncFromChat = useCallback(() => {
    if (!isBrowser) return "";

    const host = selectChatKitHost();
    const root = host?.shadowRoot ?? host;
    if (!root) return "";

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

          if (textContent !== lastSyncedRef.current) {
            lastSyncedRef.current = textContent;
            setDefinition(textContent);
          }

          return textContent;
        }
      }
    }

    return "";
  }, []);

  return { definition, syncFromChat };
}

export default useMermaidSourceSync;
