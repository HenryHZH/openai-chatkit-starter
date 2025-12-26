"use client";

import { useMemo, useState } from "react";
import { Mermaid } from "./Mermaid";

export function MermaidRendererPanel() {
  const [input, setInput] = useState("");
  const definition = useMemo(() => input.trim(), [input]);

  return (
    <details className="group rounded-3xl border border-white/70 bg-white/70 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/80">
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-slate-800 transition hover:bg-slate-100/70 dark:text-slate-100 dark:hover:bg-slate-800/60">
        <div>
          <p className="text-sm font-semibold">Mermaid 渲染器</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            将对话里的 Mermaid 代码粘贴到这里查看渲染效果。
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
        <textarea
          className="min-h-[160px] w-full resize-y rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/40"
          placeholder="例如：graph TD; A-->B; B-->C;"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />

        {definition ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              预览
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
              <Mermaid definition={definition} />
            </div>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-sm">
              <code>{`\`\`\`mermaid\n${definition}\n\`\`\``}</code>
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
