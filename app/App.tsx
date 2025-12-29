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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[460px] max-w-5xl rounded-full bg-gradient-to-b from-indigo-300/40 via-sky-200/30 to-transparent blur-3xl dark:from-indigo-500/20 dark:via-sky-500/20 animated-orb" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] z-0 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-400/10 to-transparent blur-3xl animated-orb-delay" />
      <div className="pointer-events-none absolute left-10 top-1/3 z-0 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/20 to-transparent blur-3xl drift-wave" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col gap-10 px-6 py-14 md:px-10">
        <header className="max-w-4xl">
          <div className="relative inline-flex items-center gap-4 overflow-hidden rounded-2xl bg-white/80 px-6 py-5 shadow-xl backdrop-blur-md ring-1 ring-white/60 dark:bg-slate-900/75 dark:ring-slate-800/70">
            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-sky-500 to-emerald-400" aria-hidden />
            <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 opacity-90 shadow-lg shadow-indigo-500/30" />
            <div className="relative">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 drop-shadow-sm sm:text-5xl dark:text-slate-50">
                案例分析专家
              </h1>
              <span className="mt-3 block h-[3px] w-20 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" aria-hidden />
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl bg-white/80 p-6 shadow-xl backdrop-blur-lg dark:bg-slate-900/70">
          <div className="pointer-events-none absolute inset-0 shimmer-surface" />
          <div className="relative min-h-[260px]">
            <BouncingBalls />
          </div>
        </section>

        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <MermaidPlayground scheme={scheme} />

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

      </div>
    </main>
  );
}
