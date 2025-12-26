"use client";

import { useEffect, useMemo, useState } from "react";
import useMermaidSourceSync from "@/hooks/useMermaidSourceSync";
import { Mermaid } from "./Mermaid";

export function MermaidRendererPanel() {
  const [input, setInput] = useState("");
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [review, setReview] = useState("");
  const syncedDefinition = useMermaidSourceSync();

  useEffect(() => {
    if (!syncedDefinition) return;

    setInput((current) => {
      if (current.trim() || isUserEditing) {
        return current;
      }
      return syncedDefinition;
    });
  }, [isUserEditing, syncedDefinition]);

  const definition = useMemo(() => input.trim(), [input]);

  const handleInputChange = (value: string) => {
    setInput(value);
    setIsUserEditing(true);
  };

  const handleApplySynced = () => {
    if (!syncedDefinition) return;
    setInput(syncedDefinition);
    setIsUserEditing(false);
  };

  const handleZoomChange = (value: number) => {
    setZoom(Math.min(2, Math.max(0.5, value)));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  return (
    <details className="group rounded-3xl border border-white/70 bg-white/70 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/80">
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-slate-800 transition hover:bg-slate-100/70 dark:text-slate-100 dark:hover:bg-slate-800/60">
        <div>
          <p className="text-sm font-semibold">Mermaid 渲染器</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            自动捕捉对话中的 Mermaid 代码，并提供缩放、评议与复制能力。
          </p>
        </div>
        <span className="text-xs text-slate-500 transition group-open:hidden dark:text-slate-400">
          点击展开
        </span>
        <span className="hidden text-xs text-slate-500 transition group-open:inline dark:text-slate-400">
          点击收起
        </span>
      </summary>

      <div className="space-y-4 border-t border-slate-200/60 px-4 pb-4 pt-3 dark:border-slate-800/60">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Mermaid 源码
        </label>
        {syncedDefinition ? (
          <div className="flex flex-col gap-2 rounded-xl bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-100 dark:ring-indigo-800/60 sm:flex-row sm:items-center sm:justify-between">
            <span>
              已自动检测到对话中的第一个 Mermaid 图表，点击即可一键填充。
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-3 py-1 text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                onClick={handleApplySynced}
              >
                使用检测到的图表
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:text-indigo-100 dark:hover:bg-indigo-800/60 dark:focus:ring-indigo-500/40"
                onClick={handleResetZoom}
              >
                重置缩放
              </button>
            </div>
          </div>
        ) : null}
        <textarea
          className="min-h-[160px] w-full resize-y rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/40"
          placeholder="例如：graph TD; A-->B; B-->C;"
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
        />

        {definition ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                预览
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-600 dark:text-slate-200">缩放</span>
                <input
                  aria-label="预览缩放"
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  value={Math.round(zoom * 100)}
                  onChange={(event) => handleZoomChange(Number(event.target.value) / 100)}
                  className="h-2 w-40 cursor-pointer accent-indigo-600"
                />
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => handleZoomChange(zoom - 0.1)}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => handleZoomChange(zoom + 0.1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-transparent px-2 py-1 font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:text-indigo-200 dark:hover:bg-indigo-900/40 dark:focus:ring-indigo-500/40"
                    onClick={handleResetZoom}
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
              <div className="overflow-auto rounded-lg border border-slate-100/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div
                  className="inline-block"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  <Mermaid definition={definition} />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-sm">
              <code>{`\`\`\`mermaid\n${definition}\n\`\`\``}</code>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
                <span>评议</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {review.length}/200
                </span>
              </div>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/40"
                maxLength={200}
                placeholder="输入对图表的评议、优化建议或质量反馈..."
                value={review}
                onChange={(event) => setReview(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>可以将评议复制回对话，帮助改进图表。</span>
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-3 py-1 text-[12px] font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:focus:ring-indigo-500/40"
                  onClick={() => navigator.clipboard.writeText(review)}
                  disabled={!review.trim()}
                >
                  复制评议
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            请输入 Mermaid 代码，或者将对话中的 Mermaid 内容复制到此处进行渲染预览。
          </p>
        )}
      </div>
    </details>
  );
}

export default MermaidRendererPanel;
