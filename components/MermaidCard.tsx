"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Mermaid } from "./Mermaid";

type MermaidCardProps = {
  definition: string;
};

const MAX_CODE_LENGTH = 20_000;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;

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

const encodeMermaidState = async (code: string) => {
  const trimmed = code.trim();

  if (!trimmed || trimmed.length > MAX_CODE_LENGTH) {
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

export function MermaidCard({ definition }: MermaidCardProps) {
  const [copied, setCopied] = useState(false);
  const [encodedState, setEncodedState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const encode = async () => {
      const encoded = await encodeMermaidState(definition);
      if (!cancelled) {
        setEncodedState(encoded);
      }
    };

    void encode();

    return () => {
      cancelled = true;
    };
  }, [definition]);

  const liveUrl = encodedState
    ? `https://mermaid.live/edit#pako:${encodedState}`
    : "https://mermaid.live/edit";
  const inkUrl = encodedState ? `https://mermaid.ink/svg/pako:${encodedState}` : null;

  const handleCopy = useCallback(async () => {
    const payload = definition.trim();
    if (!payload) return;

    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Clipboard write failed", error);
      const textarea = document.createElement("textarea");
      textarea.value = payload;
      textarea.style.position = "fixed";
      textarea.style.left = "-1000px";
      textarea.style.top = "-1000px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }, [definition]);

  const handleOpenLive = useCallback(() => {
    window.open(liveUrl, "_blank", "noopener,noreferrer");
  }, [liveUrl]);

  const handleOpenInk = useCallback(() => {
    if (!inkUrl) return;
    window.open(inkUrl, "_blank", "noopener,noreferrer");
  }, [inkUrl]);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#f8fafc",
        color: "#0f172a",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Mermaid diagram</div>
      <div
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: 12,
          background: "#fff",
          marginBottom: 12,
        }}
      >
        <Mermaid definition={definition} />
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "10px 12px",
          borderRadius: 8,
          overflowX: "auto",
          fontFamily: "SFMono-Regular, Consolas, \"Liberation Mono\", Menlo, monospace",
          fontSize: 13,
          margin: 0,
        }}
      >
        <code>{`\`\`\`mermaid\n${definition.trim()}\n\`\`\``}</code>
      </pre>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 10,
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          style={buttonStyle}
        >
          {copied ? "已复制" : "复制 Mermaid"}
        </button>
        <button type="button" onClick={handleOpenLive} style={buttonStyle}>
          打开 Mermaid Live
        </button>
        {inkUrl ? (
          <button type="button" onClick={handleOpenInk} style={buttonStyle}>
            打开 Mermaid Ink 预览
          </button>
        ) : null}
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

export default MermaidCard;
