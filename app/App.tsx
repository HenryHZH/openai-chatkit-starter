"use client";

import { useCallback } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[460px] max-w-5xl rounded-full bg-gradient-to-b from-indigo-300/40 via-sky-200/30 to-transparent blur-3xl dark:from-indigo-500/20 dark:via-sky-500/20 animated-orb" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] z-0 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-400/10 to-transparent blur-3xl animated-orb-delay" />
      <div className="pointer-events-none absolute left-10 top-1/3 z-0 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/20 to-transparent blur-3xl drift-wave" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-14 md:px-10">
        <header className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800/60">
            AI 案例助手
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              输入你的案例
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              你可以上传完整的案例，也可以提供案例名/案号，我将为你介绍案例。
            </p>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg backdrop-blur-lg ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/80">
          <div className="pointer-events-none absolute inset-0 shimmer-surface" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-xl text-white shadow-lg drop-shadow-lg animate-pulse">
                ⏳
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  等待时也能有趣
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  观看提示打磨、案例梳理和灵感发散的动画，让等待变得更轻松。
                </p>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800/70">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-200 to-sky-200 text-lg text-indigo-900 shadow-inner"
                  style={{ animation: "floatOrb 12s ease-in-out infinite" }}
                >
                  🔍
                </div>
                <div>
                  <p className="text-sm font-semibold">提示打磨</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">微光粒子流动展示思路扩散。</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800/70">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-200 to-teal-200 text-lg text-indigo-900 shadow-inner"
                  style={{ animation: "floatOrb 14s ease-in-out infinite", animationDelay: "-2s" }}
                >
                  📑
                </div>
                <div>
                  <p className="text-sm font-semibold">资料梳理</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">平滑亮带滚动模拟整理节奏。</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800/70">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-200 to-amber-200 text-lg text-indigo-900 shadow-inner"
                  style={{ animation: "floatOrb 16s ease-in-out infinite", animationDelay: "-4s" }}
                >
                  💡
                </div>
                <div>
                  <p className="text-sm font-semibold">灵感涌动</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">跳动的光点陪你期待回应。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative rounded-3xl border border-white/70 bg-white/70 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/80">
          <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-gradient-to-b from-slate-100/60 via-white/0 to-white/0 blur-2xl dark:from-slate-800/50" />
          <div className="relative rounded-2xl bg-gradient-to-br from-white/90 to-slate-100/70 p-4 shadow-inner dark:from-slate-900/80 dark:to-slate-950/60">
            <ChatKitPanel
              theme={scheme}
              onWidgetAction={handleWidgetAction}
              onResponseEnd={handleResponseEnd}
              onThemeRequest={setScheme}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
