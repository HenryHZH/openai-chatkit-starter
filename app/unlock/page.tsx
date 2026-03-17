"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function UnlockContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sanitizeNextPath(sp.get("next"));

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (res.ok) {
      router.replace(next);
      return;
    }
    setError("密码不正确，请重试。");
  }

  return (
    <main className="app-shell relative min-h-screen px-5 py-16 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="surface-panel relative overflow-hidden p-7 sm:p-8">
          <div className="canvas-halo pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent-main)_30%,transparent),transparent_62%)]" />
          <div className="relative">
            <span className="badge-kicker">Access Gate</span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight text-[var(--ink-900)]">
              请输入访问密码
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-650)]">
              该工作台已启用访问保护。输入正确口令后即可继续访问目标页面。
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="panel-label block" htmlFor="access-password">
                访问口令
              </label>
              <input
                id="access-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入口令"
                className="w-full rounded-[0.95rem] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_88%,transparent)] px-4 py-3 text-sm text-[var(--ink-780)] outline-none transition focus-visible:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent-cool)_38%,transparent)]"
              />
              <button
                type="submit"
                className="control-pill w-full justify-center"
                data-variant="primary"
                disabled={loading || !password.trim()}
              >
                {loading ? "验证中…" : "进入工作台"}
              </button>
            </form>

            {error ? (
              <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  if (next.startsWith("//")) {
    return "/";
  }

  if (next.includes("\\") || /%5c/i.test(next)) {
    return "/";
  }

  return next;
}

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell relative grid min-h-screen place-items-center px-5 py-16 text-[var(--ink-650)]">
          加载中…
        </main>
      }
    >
      <UnlockContent />
    </Suspense>
  );
}
