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
  const [errorSourceCode, setErrorSourceCode] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [renderedSvg, setRenderedSvg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFixingSyntax, setIsFixingSyntax] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [renderedSourceCode, setRenderedSourceCode] = useState("");
  const [pendingFixedCode, setPendingFixedCode] = useState<string | null>(null);
  const [lastFixedCode, setLastFixedCode] = useState<string | null>(null);
  const [renderNonce, setRenderNonce] = useState(0);

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
      const normalizedDiagram = diagram.trim();

      if (!normalizedDiagram) {
        setRenderedSvg("");
        setRenderedSourceCode("");
        pendingBindRef.current = null;
        setError(null);
        setErrorSourceCode(null);
        return;
      }
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: scheme === "dark" ? "dark" : "default",
        });

        const { svg, bindFunctions } = await mermaid.render(
          renderId.current,
          normalizedDiagram
        );
        setRenderedSvg(svg);
        setRenderedSourceCode(normalizedDiagram);
        pendingBindRef.current =
          typeof bindFunctions === "function" ? bindFunctions : null;
        setError(null);
        setErrorSourceCode(null);
      } catch (renderError) {
        setRenderedSvg("");
        setRenderedSourceCode("");
        pendingBindRef.current = null;
        const message =
          renderError instanceof Error
            ? renderError.message
            : "无法渲染当前的图表";
        setError(message);
        setErrorSourceCode(normalizedDiagram);
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
  }, [effectiveCode, isFullscreen, renderDiagram, renderNonce]);

  useEffect(() => {
    if (!pendingFixedCode) {
      return;
    }

    if (error) {
      setPendingFixedCode(null);
      return;
    }

    if (renderedSvg && renderedSourceCode === pendingFixedCode) {
      setLastFixedCode(pendingFixedCode);
      setPendingFixedCode(null);
    }
  }, [error, pendingFixedCode, renderedSourceCode, renderedSvg]);

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

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

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

  const handleFixSyntax = useCallback(async () => {
    const sourceCode = effectiveCode.trim();
    if (!sourceCode || isFixingSyntax) {
      return;
    }

    setIsFixingSyntax(true);
    setFixError(null);
    setPendingFixedCode(null);
    setLastFixedCode(null);

    try {
      const matchedRenderError =
        error && errorSourceCode === sourceCode ? error : undefined;

      const response = await fetch("/api/mermaid-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: sourceCode, renderError: matchedRenderError }),
      });

      const payload = (await response.json().catch(() => null)) as {
        fixedCode?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.fixedCode) {
        setFixError(payload?.error ?? "修复失败，请稍后重试");
        return;
      }

      setInputCode(payload.fixedCode);
      setPendingFixedCode(payload.fixedCode);
      setRenderNonce((current) => current + 1);
    } catch (requestError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("一键修复失败", requestError);
      }
      setFixError("网络异常，暂时无法修复");
    } finally {
      setIsFixingSyntax(false);
    }
  }, [effectiveCode, error, errorSourceCode, isFixingSyntax]);

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
        "relative min-h-[330px] overflow-hidden rounded-[1.1rem] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_86%,transparent)] p-4 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--surface-raised)_72%,transparent)]"
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerTracking}
      onPointerCancel={endPointerTracking}
    >
      <div className="canvas-grid pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklab,var(--ink-520)_18%,transparent)_1px,transparent_0)] bg-[length:22px_22px]" />
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
        <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );

  return (
    <section className="mermaid-studio surface-panel relative flex h-[min(76vh,840px)] min-h-[560px] flex-col overflow-hidden p-5 sm:p-6">
      <div className="canvas-halo pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent-cool)_28%,transparent),transparent_60%)]" />
      <div className="relative flex min-h-0 flex-1 flex-col space-y-5">
        <div className="mermaid-toolbar mermaid-toolbar--header">
          <div className="space-y-2">
            <h2 className="text-[clamp(1.55rem,2.2vw+0.8rem,2.3rem)] leading-tight text-[var(--ink-900)]">
              可视化图表
            </h2>
          </div>
          <div className="mermaid-actions">
            {clipboardCode && !inputCode ? (
              <span className="control-pill border-[color-mix(in_oklab,var(--accent-mint)_46%,transparent)] bg-[color-mix(in_oklab,var(--accent-mint)_20%,transparent)] text-[var(--accent-mint)]">
                剪贴板已接入
              </span>
            ) : null}
            <button
              type="button"
              className="control-pill"
              data-variant="primary"
              onClick={handleFixSyntax}
              disabled={!effectiveCode.trim() || isFixingSyntax || Boolean(pendingFixedCode)}
            >
              {isFixingSyntax
                ? "语法修复中"
                : pendingFixedCode
                  ? "重渲染中"
                  : lastFixedCode && lastFixedCode === effectiveCode
                    ? "已修复"
                    : "一键修复"}
            </button>
            <button
              type="button"
              className="control-pill"
              data-variant="quiet"
              onClick={() => setIsInputCollapsed((current) => !current)}
            >
              {isInputCollapsed ? "显示源码" : "收起源码"}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-5">
          {fixError ? (
            <p className="text-sm text-[var(--danger)]">{fixError}</p>
          ) : null}

          {!isInputCollapsed ? (
            <div className="surface-subtle overflow-hidden">
              <textarea
                className="min-h-[4.4rem] w-full resize-y bg-transparent px-4 py-3 text-sm leading-6 text-[var(--ink-780)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent-cool)_45%,transparent)]"
                rows={3}
                value={inputCode}
                onChange={(event) => {
                  setInputCode(event.target.value);
                  setLastFixedCode(null);
                  setPendingFixedCode(null);
                }}
                spellCheck={false}
                placeholder="粘贴 Mermaid 代码后将自动渲染"
              />
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col space-y-3">
            <div className="mermaid-toolbar mermaid-toolbar--canvas text-sm">
              <div className="mermaid-actions mermaid-actions--canvas">
                <button
                  type="button"
                  className="control-pill"
                  data-variant="quiet"
                  onClick={resetPreview}
                >
                  复位
                </button>
                <label className="mermaid-zoom rounded-full border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_86%,transparent)] px-4 py-[0.58rem] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-650)]">
                  <span className="whitespace-nowrap">缩放</span>
                  <input
                    aria-label="预览缩放"
                    className="h-2 w-36 cursor-pointer appearance-none rounded-full bg-[color-mix(in_oklab,var(--ink-520)_26%,transparent)] accent-[color-mix(in_oklab,var(--accent-main)_85%,white)]"
                    type="range"
                    min={100}
                    max={500}
                    step={25}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                  />
                  <span className="w-12 text-right text-xs tabular-nums">{zoom}%</span>
                </label>
                <button
                  type="button"
                  className="control-pill"
                  data-variant="primary"
                  onClick={() => setIsFullscreen(true)}
                >
                  全屏
                </button>
              </div>
            </div>
            <PreviewCanvas
              className="relative min-h-0 flex-1 overflow-hidden rounded-[1.1rem] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_86%,transparent)] p-4 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--surface-raised)_72%,transparent)]"
              containerRef={inlineContainerRef}
              isActive={!isFullscreen}
            />
          </div>
        </div>
      </div>
      {isFullscreen
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--surface-base)_88%,black)] text-[var(--ink-900)] backdrop-blur-xl">
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-780)]">
                    <span>Mermaid 全屏预览</span>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_70%,transparent)] px-3 py-1 text-xs text-[var(--ink-780)]">
                      缩放 {zoom}%
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      className="control-pill"
                      data-variant="quiet"
                      onClick={resetPreview}
                    >
                      复位视图
                    </button>
                    <label className="mermaid-zoom rounded-full border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_72%,transparent)] px-4 py-[0.58rem] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-780)]">
                      <span className="whitespace-nowrap">缩放</span>
                      <input
                        aria-label="全屏预览缩放"
                        className="h-2 w-40 cursor-pointer appearance-none rounded-full bg-[color-mix(in_oklab,var(--ink-520)_26%,transparent)] accent-[color-mix(in_oklab,var(--accent-main)_85%,white)]"
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
                      className="control-pill border-[color-mix(in_oklab,var(--danger)_48%,transparent)] bg-[color-mix(in_oklab,var(--danger)_24%,transparent)] text-[var(--danger)]"
                      onClick={() => setIsFullscreen(false)}
                    >
                      退出
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden px-5 pb-6 sm:px-6 sm:pb-8">
                  <PreviewCanvas
                    className="relative h-full min-h-[460px] w-full rounded-[1.2rem] border border-[var(--border-strong)] bg-[color-mix(in_oklab,var(--surface-raised)_56%,transparent)] p-6 shadow-[var(--shadow-lift)]"
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
