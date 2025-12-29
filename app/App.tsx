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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[460px] max-w-5xl rounded-full bg-gradient-to-b from-blue-200/35 via-cyan-200/25 to-transparent blur-3xl dark:from-blue-500/20 dark:via-cyan-500/15 animated-orb" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] z-0 h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-400/15 via-blue-400/10 to-transparent blur-3xl animated-orb-delay" />
      <div className="pointer-events-none absolute left-10 top-1/3 z-0 h-28 w-28 rounded-full bg-gradient-to-br from-blue-300/20 via-cyan-300/15 to-transparent blur-3xl drift-wave" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col gap-10 px-6 py-14 md:px-10">
        <header className="max-w-3xl space-y-3">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            案例分析专家
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            请在右下方输入案例，也可以上传完整的裁判文书或案卷，专家将在5分钟内完成分析。
          </p>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg backdrop-blur-lg ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/80">
          <div className="pointer-events-none absolute inset-0 shimmer-surface" />
          <div className="relative min-h-[260px]">
            <BouncingBalls />
          </div>
        </section>

        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <MermaidPlayground scheme={scheme} />

          <div className="relative rounded-3xl border border-white/70 bg-white/75 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-slate-800/80">
            <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-gradient-to-b from-blue-50/70 via-white/0 to-white/0 blur-2xl dark:from-slate-800/40" />
            <div className="relative rounded-2xl bg-gradient-to-br from-white/95 via-slate-50/70 to-blue-50/60 p-4 shadow-inner dark:from-slate-900/85 dark:via-slate-900/70 dark:to-slate-950/60">
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
