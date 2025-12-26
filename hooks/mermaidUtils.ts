"use client";

const isBrowser = typeof window !== "undefined";

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

const MAX_CODE_LENGTH = 20_000;

const MERMAID_THEME_CONFIG = {
  theme: "neutral",
  themeVariables: {
    background: "transparent",
    fontFamily:
      "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    primaryColor: "#4f46e5",
    primaryBorderColor: "#4338ca",
    primaryTextColor: "#0f172a",
    lineColor: "#1e293b",
    textColor: "#0f172a",
    noteBkgColor: "#eef2ff",
    noteBorderColor: "#c7d2fe",
  },
};

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

const toBase64Url = (bytes: Uint8Array) => {
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const compressWithStream = async (input: string) => {
  if (typeof CompressionStream === "undefined") {
    return null;
  }

  const encoder = new TextEncoder();
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  await writer.write(encoder.encode(input));
  await writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done ?? false;
    if (result.value) {
      chunks.push(result.value);
    }
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
};

export const encodeMermaidState = async (definition: string) => {
  const trimmed = definition.trim();

  if (!trimmed || trimmed.length > MAX_CODE_LENGTH || !isBrowser) {
    return null;
  }

  try {
    const state = { code: trimmed, mermaid: { theme: "default" } };
    const compressed = await compressWithStream(JSON.stringify(state));
    if (!compressed) return null;
    return toBase64Url(compressed);
  } catch (error) {
    console.error("Failed to encode Mermaid payload", error);
    return null;
  }
};

export const buildMermaidInkUrl = async (definition: string) => {
  const trimmed = definition.trim();
  if (!trimmed) return null;

  const encoded = await encodeMermaidState(trimmed);
  if (encoded) {
    return `https://mermaid.ink/svg/pako:${encoded}`;
  }

  return `https://mermaid.ink/svg/${encodeURIComponent(trimmed)}`;
};

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
  const renderFallback = async () => {
    try {
      const inkUrl = await buildMermaidInkUrl(definition);
      if (!inkUrl) return;

      const response = await fetch(inkUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const svg = await response.text();
      if (!svg.trim().startsWith("<svg")) {
        throw new Error("Invalid SVG response");
      }

      host.innerHTML = svg;
      host.dataset.mermaidRendered = "remote";
    } catch (error) {
      console.error("Failed to render mermaid diagram via ink", error);
      host.innerHTML = "";
      host.dataset.mermaidRendered = "false";
      host.textContent = definition;
      host.style.whiteSpace = "pre-wrap";
    }
  };

  const mermaid = await loadMermaid();
  if (!mermaid || typeof mermaid.render !== "function") {
    await renderFallback();
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    ...MERMAID_THEME_CONFIG,
  });

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
    await renderFallback();
  }
};
