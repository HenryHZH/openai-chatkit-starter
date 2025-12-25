"use client";

const isBrowser = typeof window !== "undefined";

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

export type MermaidAPI = {
  initialize: (config: { startOnLoad: boolean; securityLevel?: string }) => void;
  run?: (options: { nodes: Iterable<Element> }) => Promise<unknown> | unknown;
  init?: (config: unknown, nodes: Iterable<Element>) => void;
  render?: (
    id: string,
    definition: string
  ) => Promise<{
    svg: string;
    bindFunctions?: (element: Element) => void;
  }>;
};

let mermaidLoader: Promise<MermaidAPI | null> | null = null;

export const generateMermaidRenderId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mermaid-${Math.random().toString(36).slice(2)}`;

export const loadMermaid = () => {
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

export const renderMermaidDefinition = async (
  host: HTMLElement,
  definition: string,
  id?: string
) => {
  const mermaid = await loadMermaid();
  if (!mermaid || typeof mermaid.render !== "function") return;

  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

  try {
    const { svg, bindFunctions } = await mermaid.render(
      id ?? generateMermaidRenderId(),
      definition
    );
    host.innerHTML = svg;
    bindFunctions?.(host);
    host.dataset.mermaidRendered = "true";
  } catch (error) {
    console.error("Failed to render mermaid diagram", error);
    host.innerHTML = "";
    host.dataset.mermaidRendered = "false";
    host.textContent = definition;
    host.style.whiteSpace = "pre-wrap";
  }
};
