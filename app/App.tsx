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
        <header className="intro-reveal grid gap-7">
          <div className="surface-subtle grid gap-3 overflow-hidden px-4 py-3 sm:px-5">
            <div className="orbital-ring pointer-events-none -right-10 -top-14 h-32 w-32" />
            <div className="relative flex flex-wrap items-center gap-2 text-xs text-[var(--ink-650)]">
              <span className="meta-pill">可视化审查</span>
              <span className="meta-pill">争点推演</span>
              <span className="meta-pill">证据链复盘</span>
            </div>
          </div>

          <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-5">
              <span className="badge-kicker">Case Studio · 5分钟结构化输出</span>
              <h1 className="section-title max-w-[14ch]">案例分析专家</h1>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <span className="metric-chip">
                  <strong>3</strong>
                  分钟建立争点图谱
                </span>
                <span className="metric-chip">
                  <strong>双轨</strong>
                  聊天 + 图谱并行
                </span>
                <span className="metric-chip">
                  <strong>可追溯</strong>
                  证据链逐步验证
                </span>
              </div>
            </div>

            <aside className="surface-panel intro-reveal relative overflow-hidden p-6 sm:p-7">
              <div className="canvas-halo pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent-cool)_42%,transparent),transparent_62%)]" />
              <p className="panel-label relative">工作流</p>
            </aside>
          </div>
        </header>

        <section className="relative">
          <div className="surface-panel section-frame relative overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
            <div className="canvas-grid pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--ink-520)_14%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--ink-520)_14%,transparent)_1px,transparent_1px)] bg-[size:30px_30px]" />
            <BouncingBalls scheme={scheme} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[1.08fr_1fr]">
          <div className="section-frame">
            <MermaidPlayground scheme={scheme} />
          </div>
          <div className="section-frame">
            <ChatKitPanel
              theme={scheme}
              onWidgetAction={handleWidgetAction}
              onResponseEnd={handleResponseEnd}
              onThemeRequest={setScheme}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
