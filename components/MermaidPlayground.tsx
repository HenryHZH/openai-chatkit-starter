"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
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
  const [renderedSvg, setRenderedSvg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderId = useRef(`mermaid-preview-${Math.random().toString(36).slice(2)}`);
  const inlineContainerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const mermaidRef = useRef<MermaidAPI | null>(null);
  const pendingBindRef = useRef<((element: Element) => void) | null>(null);
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
        setRenderedSvg("");
        pendingBindRef.current = null;
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
        setRenderedSvg(svg);
        pendingBindRef.current =
          typeof bindFunctions === "function" ? bindFunctions : null;
        setError(null);
      } catch (renderError) {
        setRenderedSvg("");
        pendingBindRef.current = null;
        const message =
          renderError instanceof Error
            ? renderError.message
            : "无法渲染当前的图表";
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
  }, [effectiveCode, isFullscreen, renderDiagram]);

  useEffect(() => {
    const activeContainer = isFullscreen
      ? fullscreenContainerRef.current
      : inlineContainerRef.current;

    if (!renderedSvg || !activeContainer) {
      return;
    }

    const bindFunction = pendingBindRef.current;
    if (typeof bindFunction === "function") {
      bindFunction(activeContainer);
      pendingBindRef.current = null;
    }
  }, [isFullscreen, renderedSvg]);

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

  const resetPreview = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(100);
  }, []);

  const PreviewCanvas = ({
    className,
    containerRef,
    isActive = true,
  }: {
    className?: string;
    containerRef: typeof inlineContainerRef;
    isActive?: boolean;
  }) => (
    <div
      className={
        className ??
        "relative min-h-[320px] overflow-hidden rounded-lg border border-slate-200 bg-white/90 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/80"
      }
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
        <div
          ref={containerRef}
          className="mermaid"
          aria-live="polite"
          aria-label="Mermaid 预览"
          dangerouslySetInnerHTML={{ __html: isActive ? renderedSvg : "" }}
        />
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );

  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/85">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-full bg-gradient-to-b from-slate-100/70 via-white/0 to-white/0 blur-2xl dark:from-slate-800/60" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            案例可视化图表
          </h2>
          <div className="flex items-center gap-3">
            {clipboardCode && !inputCode ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-100 dark:ring-emerald-800/80">
                剪贴板内容已自动渲染
              </span>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700/80"
              onClick={() => setIsInputCollapsed((current) => !current)}
            >
              {isInputCollapsed ? "展开输入" : "收起输入"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {!isInputCollapsed ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-900">
              <textarea
                className="w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-100"
                rows={2}
                style={{ maxHeight: "5.5rem" }}
                value={inputCode}
                onChange={(event) => setInputCode(event.target.value)}
                spellCheck={false}
                placeholder="复制或输入后立即渲染"
              />
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <span>预览</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-50 backdrop-blur dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700/80 dark:hover:bg-slate-700/80"
                  onClick={resetPreview}
                >
                  默认
                </button>
                <label className="flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700/80">
                  <span className="whitespace-nowrap">缩放</span>
                  <input
                    aria-label="预览缩放"
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
                  className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm ring-1 ring-indigo-500/70 transition hover:bg-indigo-500 backdrop-blur dark:ring-indigo-400/70"
                  onClick={() => setIsFullscreen(true)}
                >
                  全屏
                </button>
              </div>
            </div>
            <PreviewCanvas
              containerRef={inlineContainerRef}
              isActive={!isFullscreen}
            />
          </div>
        </div>
      </div>
      {isFullscreen
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-slate-900/95 text-slate-50 backdrop-blur-md">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">
                    <span>Mermaid 全屏预览</span>
                    <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-200 ring-1 ring-slate-700">
                      缩放 {zoom}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 shadow-sm ring-1 ring-slate-600 transition hover:bg-white/20"
                      onClick={resetPreview}
                    >
                      默认
                    </button>
                    <label className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 shadow-sm ring-1 ring-slate-700/80">
                      <span className="whitespace-nowrap">缩放</span>
                      <input
                        aria-label="全屏预览缩放"
                        className="h-2 w-40 cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-400"
                        type="range"
                        min={100}
                        max={500}
                        step={25}
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                      />
                      <span className="w-14 text-right tabular-nums text-sm">{zoom}%</span>
                    </label>
                    <button
                      type="button"
                      aria-label="退出全屏"
                      className="rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm ring-1 ring-rose-400 transition hover:bg-rose-400"
                      onClick={() => setIsFullscreen(false)}
                    >
                      退出全屏
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden px-6 pb-8">
                  <PreviewCanvas
                    className="relative h-full min-h-[480px] w-full rounded-xl border border-slate-700 bg-slate-900/70 p-6 shadow-2xl"
                    containerRef={fullscreenContainerRef}
                    isActive={isFullscreen}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
