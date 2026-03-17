"use client";

import { useCallback } from "react";
import { BouncingBalls } from "@/components/BouncingBalls";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { MermaidPlayground } from "@/components/MermaidPlayground";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function App() {
  const { scheme, setScheme } = useColorScheme();

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
  }, []);

  return (
    <main className="app-shell relative min-h-screen text-[var(--ink-900)]">
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 pb-14 pt-8 sm:px-8 lg:gap-10 lg:px-12 lg:pt-12">
        <header className="intro-reveal grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <span className="badge-kicker">Case Studio · 5分钟结构化输出</span>
            <h1 className="section-title max-w-[14ch]">案例分析专家</h1>
            <p className="max-w-[56ch] text-base leading-7 text-[var(--ink-650)] sm:text-lg">
              上传裁判文书、案卷材料或直接输入案情后，系统会同步生成
              Chat 报告与 Mermaid 结构图，用于复盘事实链、争议点和裁判理由。
            </p>
          </div>

          <aside className="surface-panel intro-reveal relative overflow-hidden p-6 sm:p-7">
            <div className="canvas-halo pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent-cool)_42%,transparent),transparent_62%)]" />
            <p className="panel-label relative">工作流</p>
            <ol className="relative mt-4 space-y-4 text-sm leading-6 text-[var(--ink-650)]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-soft)] text-[11px] font-semibold text-[var(--ink-780)]">
                  1
                </span>
                <span>在右侧会话中给出案件背景，并上传原始文书。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-soft)] text-[11px] font-semibold text-[var(--ink-780)]">
                  2
                </span>
                <span>左侧实时查看关系图，定位事实与法律要件的对应。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-soft)] text-[11px] font-semibold text-[var(--ink-780)]">
                  3
                </span>
                <span>根据输出继续追问，快速沉淀最终案例报告。</span>
              </li>
            </ol>
          </aside>
        </header>

        <section className="relative">
          <div className="surface-panel relative overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
            <div className="canvas-grid pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--ink-520)_14%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--ink-520)_14%,transparent)_1px,transparent_1px)] bg-[size:30px_30px]" />
            <div className="relative mb-3 flex flex-wrap items-center justify-between gap-3 px-2 pt-1 sm:px-3">
              <span className="panel-label">证据动态场</span>
              <span className="text-xs font-medium text-[var(--ink-520)]">
                拖拽粒子可模拟事实权重与冲突碰撞
              </span>
            </div>
            <BouncingBalls scheme={scheme} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[1.08fr_1fr]">
          <MermaidPlayground scheme={scheme} />
          <ChatKitPanel
            theme={scheme}
            onWidgetAction={handleWidgetAction}
            onResponseEnd={handleResponseEnd}
            onThemeRequest={setScheme}
          />
        </section>
      </div>
    </main>
  );
}
