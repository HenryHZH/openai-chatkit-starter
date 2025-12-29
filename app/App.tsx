"use client";

import { useMemo } from "react";
import { ChatKitPanel } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";

const themeOptions = [
  { label: "System", value: "system" as const },
  { label: "Light", value: "light" as const },
  { label: "Dark", value: "dark" as const },
];

export default function App() {
  const { scheme, preference, setPreference, setScheme } = useColorScheme();

  const themeDescription = useMemo(() => {
    if (preference === "system") {
      return "Follows your OS preference";
    }
    return preference === "light" ? "Light UI" : "Dark UI";
  }, [preference]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-12 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="inline-flex items-center rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-400/10 dark:text-blue-100">
            OpenAI ChatKit
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            ChatKit Starter Template
          </h1>
          <p className="max-w-3xl text-lg text-slate-700 dark:text-slate-200">
            A minimal Next.js example that hosts your Agent Builder workflow through the ChatKit web component.
            Customize your prompts, greeting, and theme to match your product and start testing quickly.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Configuration</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">Update <code className="text-xs font-mono">.env.local</code> with your ChatKit credentials.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">Theme</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{themeDescription}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-200">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800/70 dark:bg-slate-800/50">
                <p className="font-semibold text-slate-900 dark:text-slate-50">Workflow ID</p>
                <p className="text-slate-600 dark:text-slate-200">Set <code className="text-xs font-mono">NEXT_PUBLIC_CHATKIT_WORKFLOW_ID</code> to your published Agent Builder workflow ID.</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800/70 dark:bg-slate-800/50">
                <p className="font-semibold text-slate-900 dark:text-slate-50">API Key</p>
                <p className="text-slate-600 dark:text-slate-200">Provide an <code className="text-xs font-mono">OPENAI_API_KEY</code> from the same project as your workflow so sessions can be created.</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800/70 dark:bg-slate-800/50">
                <p className="font-semibold text-slate-900 dark:text-slate-50">Optional Domain Key</p>
                <p className="text-slate-600 dark:text-slate-200">Add <code className="text-xs font-mono">NEXT_PUBLIC_CHATKIT_DOMAIN_KEY</code> for production to keep the widget mounted after the domain allowlist check.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                    preference === option.value
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600"
                  }`}
                  onClick={() =>
                    option.value === "light" || option.value === "dark"
                      ? setScheme(option.value)
                      : setPreference(option.value)
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-2 shadow-xl backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80">
            <div className="rounded-xl bg-gradient-to-b from-white/80 to-slate-50/70 p-3 dark:from-slate-900/70 dark:to-slate-950/60">
              <ChatKitPanel theme={scheme} onThemeRequest={setScheme} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
