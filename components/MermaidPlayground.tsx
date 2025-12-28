"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { ColorScheme } from "@/hooks/useColorScheme";

const DEFAULT_DIAGRAM = `graph TD
  A[开始] --> B{条件?}
  B -->|是| C[处理1]
  B -->|否| D[处理2]
  C --> E[结束]
  D --> E
`;

type MermaidAPI = {
  initialize: (config: unknown) => void;
  render: (
    id: string,
    text: string
  ) => Promise<{
    svg: string;
    bindFunctions?: (element: Element) => void;
  }>;
};

type MermaidPlaygroundProps = {
  scheme: ColorScheme;
};

export function MermaidPlayground({ scheme }: MermaidPlaygroundProps) {
  const [code, setCode] = useState(DEFAULT_DIAGRAM);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const renderId = useRef(`mermaid-preview-${Math.random().toString(36).slice(2)}`);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mermaidRef = useRef<MermaidAPI | null>(null);
  const pointerState = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const loadMermaid = useCallback(async () => {
    if (mermaidRef.current) {
      return mermaidRef.current;
    }
    const mermaidModule = (await import(
      /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"
    )) as {
      default?: MermaidAPI;
    };
    const instance = mermaidModule.default ?? (mermaidModule as unknown as MermaidAPI);
    mermaidRef.current = instance;
    return instance;
  }, []);

  const renderDiagram = useCallback(
    async (diagram: string) => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: scheme === "dark" ? "dark" : "default",
        });

        const { svg, bindFunctions } = await mermaid.render(renderId.current, diagram);
        if (!containerRef.current) {
          return;
        }
        containerRef.current.innerHTML = svg;
        if (typeof bindFunctions === "function") {
          bindFunctions(containerRef.current);
        }
        setError(null);
      } catch (renderError) {
        if (!containerRef.current) {
          return;
        }
        containerRef.current.innerHTML = "";
        const message =
          renderError instanceof Error
            ? renderError.message
            : "无法渲染当前的 mermaid 图表";
        setError(message);
      }
    },
    [loadMermaid, scheme]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) {
        return;
      }
      await renderDiagram(code);
    })();

    return () => {
      cancelled = true;
    };
  }, [code, renderDiagram]);

  const scale = useMemo(() => Math.max(1, zoom / 100), [zoom]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      pointerState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: panOffset.x,
        originY: panOffset.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPanning(true);
    },
    [panOffset.x, panOffset.y]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerState.current.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - pointerState.current.startX;
      const deltaY = event.clientY - pointerState.current.startY;
      setPanOffset({
        x: pointerState.current.originX + deltaX,
        y: pointerState.current.originY + deltaY,
      });
    },
    []
  );

  const endPointerTracking = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerState.current.pointerId !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      pointerState.current = {
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: panOffset.x,
        originY: panOffset.y,
      };
      setIsPanning(false);
    },
    [panOffset.x, panOffset.y]
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-slate-800/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-full bg-gradient-to-b from-slate-100/70 via-white/0 to-white/0 blur-2xl dark:from-slate-800/60" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Mermaid 实时渲染器
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              随输入实时预览图形
            </h2>
          </div>
          <label className="flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700/80">
            <span className="whitespace-nowrap">缩放</span>
            <input
              aria-label="Mermaid 预览缩放"
              className="h-2 w-40 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-slate-700"
              type="range"
              min={100}
              max={500}
              step={25}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <span className="w-14 text-right tabular-nums text-sm">{zoom}%</span>
          </label>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Mermaid 输入</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">实时渲染</span>
            </label>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
              <textarea
                className="h-32 w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-100"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>预览</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">支持 100%-500% 缩放</span>
            </div>
            <div
              className="relative min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPointerTracking}
              onPointerCancel={endPointerTracking}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.12)_1px,_transparent_0)] bg-[length:20px_20px]" />
              <div
                className="relative origin-top-left"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                  cursor: isPanning ? "grabbing" : "grab",
                }}
              >
                <div ref={containerRef} className="mermaid" aria-live="polite" aria-label="Mermaid 预览" />
              </div>
              {error ? (
                <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
