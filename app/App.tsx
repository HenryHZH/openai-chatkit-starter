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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[460px] max-w-5xl rounded-full bg-gradient-to-b from-indigo-300/40 via-sky-200/30 to-transparent blur-3xl dark:from-indigo-500/20 dark:via-sky-500/20" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] z-0 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-400/10 to-transparent blur-3xl" />

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
              分享你的场景、素材或问题，我们会将它们转化为清晰的提示，并为你提供连贯的对话体验。
            </p>
          </div>
        </header>

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
