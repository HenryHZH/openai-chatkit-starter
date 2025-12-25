"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  generateMermaidRenderId,
  renderMermaidDefinition,
} from "@/hooks/mermaidUtils";

type MermaidProps = {
  definition: string;
};

export function Mermaid({ definition }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderId = useMemo(() => generateMermaidRenderId(), []);

  useEffect(() => {
    const host = containerRef.current;
    if (!host || !definition.trim()) return;

    host.dataset.mermaidDefinition = definition;
    void renderMermaidDefinition(host, definition, renderId);
  }, [definition, renderId]);

  return (
    <div
      ref={containerRef}
      className="mermaid"
      data-mermaid-definition={definition}
      aria-label="Mermaid diagram"
    />
  );
}

export default Mermaid;
