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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-slate-200/70 via-white/0 to-white/0 dark:from-slate-800/60" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col gap-10 px-6 py-14 md:px-10">
        <header className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-50 shadow-sm ring-1 ring-slate-800 dark:bg-slate-800">
            5分钟可视化分析
          </span>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              案例分析专家
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              上传完整的裁判文书/案卷，也可以直接键入案例
            </p>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-100/70 via-white/0 to-slate-200/30 dark:from-slate-800/30" />
          <div className="relative min-h-[260px]">
            <BouncingBalls />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <MermaidPlayground scheme={scheme} />

          <div className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="absolute inset-x-10 top-0 h-20 rounded-full bg-gradient-to-b from-slate-100/80 via-white/0 to-white/0 blur-2xl dark:from-slate-800/60" />
            <div className="relative rounded-md bg-slate-50 p-4 shadow-sm dark:bg-slate-950/60">
              <ChatKitPanel
                theme={scheme}
                onWidgetAction={handleWidgetAction}
                onResponseEnd={handleResponseEnd}
                onThemeRequest={setScheme}
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
