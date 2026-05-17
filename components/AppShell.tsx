"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDisplayCurrency } from "@/lib/storage";
import { supabaseConfigured } from "@/lib/supabase";
import { useTwelveDataConfigured } from "@/lib/hooks";
import { usePortfolioTone } from "@/lib/portfolioTone";
import { CurrencyToggle } from "./CurrencyToggle";

type AddCtx = {
  setHandler: (fn: (() => void) | null) => void;
  trigger: () => void;
  hasHandler: boolean;
};
const AddContext = createContext<AddCtx | null>(null);

export function useRegisterAdd(handler: () => void) {
  const ctx = useContext(AddContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setHandler(handler);
    return () => ctx.setHandler(null);
  }, [ctx, handler]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [handler, setHandlerState] = useState<(() => void) | null>(null);
  const setHandler = useCallback((fn: (() => void) | null) => setHandlerState(() => fn), []);
  const trigger = useCallback(() => {
    if (handler) handler();
  }, [handler]);
  const ctx: AddCtx = useMemo(
    () => ({ setHandler, trigger, hasHandler: !!handler }),
    [setHandler, trigger, handler]
  );

  const pathname = usePathname();
  const isInv = pathname?.startsWith("/investments");
  const isInc = pathname?.startsWith("/income");
  const [ccy, setCcy] = useDisplayCurrency();
  const tone = usePortfolioTone();
  const dotClass =
    tone === "positive" ? "bg-positive" : tone === "negative" ? "bg-negative" : "bg-ink";

  return (
    <AddContext.Provider value={ctx}>
      <div className="min-h-screen text-ink">
        <header
          data-app-chrome
          className="hidden lg:block sticky top-0 z-30 bg-paper/70 backdrop-blur-xl border-b border-line/70"
        >
          <div className="max-w-5xl mx-auto px-4 h-[68px] flex items-center justify-between gap-6">
            <Link
              href="/investments"
              className="group inline-flex items-center gap-2 font-semibold lowercase text-[17px] tracking-tight rounded-md"
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${dotClass}`} aria-hidden />
              mibu
            </Link>
            <nav className="flex items-center bg-chip/80 rounded-full p-1">
              <DesktopTab href="/investments" active={!!isInv}>
                investments
              </DesktopTab>
              <DesktopTab href="/income" active={!!isInc}>
                income
              </DesktopTab>
            </nav>
            <div className="flex items-center gap-3">
              <CurrencyToggle value={ccy} onChange={setCcy} />
              <span className="w-px h-5 bg-line" aria-hidden />
              <button
                onClick={trigger}
                disabled={!ctx.hasHandler}
                className="inline-flex items-center gap-1.5 bg-ink text-paper rounded-full pl-3 pr-4 py-2 text-sm font-medium shadow-soft hover:shadow-pop disabled:opacity-30 disabled:shadow-none active:scale-[0.97] transition duration-200"
              >
                <PlusIcon size={14} /> add
              </button>
            </div>
          </div>
        </header>

        <header
          data-app-chrome
          className="lg:hidden sticky top-0 z-30 bg-paper/70 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="inline-flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${dotClass}`} aria-hidden />
              <h1 className="text-[17px] font-semibold lowercase tracking-tight">mibu</h1>
            </div>
            <CurrencyToggle value={ccy} onChange={setCcy} />
          </div>
        </header>

        <SetupBanner />

        <main className="lg:max-w-5xl lg:mx-auto lg:px-4 lg:pt-8 pb-32 lg:pb-20 px-5">
          <div>{children}</div>
        </main>
        <nav
          data-app-chrome
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-paper/85 backdrop-blur-xl border-t border-line/70"
        >
          <div className="flex items-center justify-between max-w-md mx-auto px-8">
            <BottomTab href="/investments" active={!!isInv} label="investments">
              <IconChart active={!!isInv} />
            </BottomTab>

            <button
              onClick={trigger}
              disabled={!ctx.hasHandler}
              className="w-14 h-14 -mt-7 rounded-full bg-ink text-paper grid place-items-center shadow-fab active:scale-90 transition duration-200 disabled:opacity-40 disabled:shadow-none"
              aria-label="add"
            >
              <PlusIcon size={22} />
            </button>

            <BottomTab href="/income" active={!!isInc} label="income">
              <IconWallet active={!!isInc} />
            </BottomTab>
          </div>
        </nav>
      </div>
    </AddContext.Provider>
  );
}

function SetupBanner() {
  const [supaOk, setSupaOk] = useState<boolean | null>(null);
  const tdOk = useTwelveDataConfigured();
  useEffect(() => {
    setSupaOk(supabaseConfigured());
  }, []);
  if (supaOk === null || tdOk === null) return null;
  if (supaOk && tdOk) return null;
  const missing: string[] = [];
  if (!supaOk) missing.push("supabase (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  if (!tdOk) missing.push("twelve data (TWELVE_DATA_API_KEY)");
  return (
    <div className="mx-5 lg:max-w-5xl lg:mx-auto lg:px-4 mt-3">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-3">
        <span className="font-semibold">setup incomplete:</span> missing {missing.join(" and ")}.
        add to <code className="font-mono">.env.local</code>, run{" "}
        <code className="font-mono">supabase/schema.sql</code>, then restart{" "}
        <code className="font-mono">npm run dev</code>.
      </div>
    </div>
  );
}

function DesktopTab({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition duration-200 lowercase ${
        active ? "bg-paper text-ink shadow-soft" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function BottomTab({
  href,
  active,
  label,
  children
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex flex-col items-center gap-1 px-4 pt-1.5 pb-2 rounded-xl transition ${
        active ? "text-ink" : "text-muted active:text-ink"
      }`}
    >
      {children}
      <span className="text-[11px] lowercase tracking-tight">{label}</span>
    </Link>
  );
}

function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15v-4M12 15V8M16 15v-6" />
    </svg>
  );
}

function IconWallet({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2H5a2 2 0 0 0-2 2V7Z" />
      <path d="M3 11v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6H5a2 2 0 0 1-2-2v2Z" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
