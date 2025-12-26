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

export const MERMAID_CODE_SELECTORS = [
  "pre code",
  "code[data-language]",
  "code[data-lang]",
  "code[class*=\"language-\"]",
  "[data-code-block-language]",
  "[data-code-language]",
  "[data-lexical-editor][data-language]",
  "[data-lexical-editor][data-lang]",
  ".mermaid",
  ".language-mermaid",
  ".lang-mermaid",
];

export const selectChatKitHost = () =>
  document.querySelector<HTMLElement & { shadowRoot?: ShadowRoot }>(
    "openai-chatkit"
  );

export const getCodeLanguage = (block: HTMLElement) => {
  const dataLanguage =
    (block.dataset.codeBlockLanguage ??
      block.dataset.codeLanguage ??
      block.dataset.language ??
      block.dataset.lang ??
      "").toLowerCase();
  if (dataLanguage) return dataLanguage;

  const classNames = block.className ?? "";
  const match = classNames.match(/language-([a-z0-9+-]+)/i);
  if (match) {
    return match[1].toLowerCase();
  }

  return "";
};

export const resolveMermaidContainer = (block: HTMLElement) =>
  block.closest<HTMLElement>(
    "pre, [data-code-block-language], [data-code-language], [data-language], [data-lang], .mermaid, code"
  ) ?? block;

export const isMermaidLanguage = (language: string) =>
  MERMAID_LANGUAGE_HINTS.has(language.toLowerCase());

export const isMermaidDefinition = (definition: string) =>
  MERMAID_DEFINITION_PATTERNS.some((pattern) => pattern.test(definition));

export const collectShadowRoots = (root: Element | ShadowRoot) => {
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
