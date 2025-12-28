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

const MERMAID_KEYWORDS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
];

const getMermaidFromText = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("```mermaid")) {
    return normalized;
  }

  const matchesKeyword = MERMAID_KEYWORDS.some((keyword) => {
    const k = keyword.toLowerCase();
    return (
      lower.startsWith(k) || lower.includes(`\n${k}`) || lower.includes(`\r${k}`)
    );
  });

  return matchesKeyword ? normalized : "";
};

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
  const [inputCode, setInputCode] = useState("");
  const [clipboardCode, setClipboardCode] = useState("");
  const [isInputCollapsed, setIsInputCollapsed] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      if (!diagram.trim()) {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
        setError(null);
        return;
      }
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
    let isActive = true;

    const readClipboard = async () => {
      if (!navigator?.clipboard?.readText) {
        return;
      }

      try {
        const content = await navigator.clipboard.readText();
        const normalized = getMermaidFromText(content);

        if (!isActive) {
          return;
        }

        if (!normalized) {
          setClipboardCode("");
          return;
        }

        setClipboardCode((current) =>
          current === normalized ? current : normalized
        );
      } catch (clipboardError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("读取剪贴板失败", clipboardError);
        }
      }
    };

    readClipboard();
    const intervalId = window.setInterval(readClipboard, 3000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const effectiveCode = useMemo(() => {
    if (inputCode.trim()) {
      return inputCode;
    }
    return clipboardCode;
  }, [clipboardCode, inputCode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) {
        return;
      }
      await renderDiagram(effectiveCode);
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveCode, renderDiagram]);

  const scale = useMemo(() => Math.max(1, zoom / 100), [zoom]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

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

  const resetView = useCallback(() => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const previewWrapperClass = useMemo(
    () =>
      isFullscreen
        ? "fixed inset-4 z-50 flex flex-col gap-3 rounded-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-xl dark:bg-slate-950/90 dark:ring-slate-800/80"
        : "space-y-3",
    [isFullscreen]
  );

  const previewContainerClass = useMemo(
    () =>
      `relative min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80 ${
        isFullscreen ? "flex-1 h-full" : ""
      }`,
    [isFullscreen]
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-slate-800/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-full bg-gradient-to-b from-slate-100/70 via-white/0 to-white/0 blur-2xl dark:from-slate-800/60" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            可视化图表
          </h2>
          {clipboardCode && !inputCode ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-100 dark:ring-emerald-800/80">
              检测到剪贴板 Mermaid 内容
            </span>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Mermaid 输入</span>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="whitespace-nowrap">实时渲染</span>
                <button
                  type="button"
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700/80"
                  onClick={() => setIsInputCollapsed((current) => !current)}
                >
                  {isInputCollapsed ? "展开输入" : "收起输入"}
                </button>
              </div>
            </div>
            {!isInputCollapsed ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
                <textarea
                  className="w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-100"
                  rows={2}
                  style={{ maxHeight: "5.5rem" }}
                  value={inputCode}
                  onChange={(event) => setInputCode(event.target.value)}
                  spellCheck={false}
                  placeholder="粘贴或输入 Mermaid 代码后立即渲染"
                />
              </div>
            ) : null}
          </div>

          <div className={previewWrapperClass}>
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>预览</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700/80">
                  <span className="whitespace-nowrap">缩放</span>
                  <input
                    aria-label="Mermaid 预览缩放"
                    className="h-2 w-36 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-slate-700"
                    type="range"
                    min={100}
                    max={500}
                    step={25}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                  />
                  <span className="w-12 text-right tabular-nums text-sm">{zoom}%</span>
                </label>
                <button
                  type="button"
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700/80"
                  onClick={resetView}
                >
                  恢复默认大小
                </button>
                <button
                  type="button"
                  className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-indigo-400 dark:hover:bg-indigo-500"
                  onClick={() => setIsFullscreen((current) => !current)}
                >
                  {isFullscreen ? "退出全屏" : "全屏预览"}
                </button>
              </div>
            </div>
            <div
              className={previewContainerClass}
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
      {isFullscreen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}
