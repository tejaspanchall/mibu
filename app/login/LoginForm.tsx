"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "incorrect password");
        setSubmitting(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid place-items-center px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-paper rounded-3xl shadow-pop border border-line/70 p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-ink" aria-hidden />
          <h1 className="text-[17px] font-semibold tracking-tight lowercase">mibu</h1>
        </div>

        <label htmlFor="password" className="block text-xs text-muted mb-2 lowercase">
          password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          className="w-full bg-chip/70 rounded-xl px-3.5 py-3 text-sm placeholder:text-muted focus-visible:bg-paper focus-visible:shadow-focus transition"
          placeholder="enter password"
        />

        {error && (
          <div className="mt-3 text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!password || submitting}
          className="mt-5 w-full bg-ink text-paper rounded-full py-3 text-sm font-medium shadow-soft hover:shadow-pop disabled:opacity-30 disabled:shadow-none active:scale-[0.98] transition duration-200 lowercase"
        >
          {submitting ? "signing in…" : "sign in"}
        </button>
      </form>
    </div>
  );
}
