"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDisplayCurrency } from "@/lib/storage";
import { supabaseConfigured } from "@/lib/supabase";
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

function pageTitle(pathname: string | null) {
  if (pathname?.startsWith("/income")) return "income";
  return "investments";
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
  const title = pageTitle(pathname);
  const isInv = pathname?.startsWith("/investments");
  const isInc = pathname?.startsWith("/income");
  const [ccy, setCcy] = useDisplayCurrency();

  return (
    <AddContext.Provider value={ctx}>
      <div className="min-h-screen bg-paper text-ink">
        {/* Desktop top nav */}
        <header className="hidden lg:block sticky top-0 z-30 bg-paper/85 backdrop-blur border-b border-line">
          <div className="max-w-3xl mx-auto px-8 h-16 flex items-center justify-between gap-6">
            <Link href="/investments" className="font-semibold lowercase text-lg tracking-tight">
              mibu
            </Link>
            <nav className="flex items-center bg-chip rounded-full p-1">
              <DesktopTab href="/investments" active={!!isInv}>
                investments
              </DesktopTab>
              <DesktopTab href="/income" active={!!isInc}>
                income
              </DesktopTab>
            </nav>
            <div className="flex items-center gap-3">
              <CurrencyToggle value={ccy} onChange={setCcy} />
              <button
                onClick={trigger}
                disabled={!ctx.hasHandler}
                className="inline-flex items-center gap-1.5 bg-ink text-paper rounded-full pl-3 pr-4 py-2 text-sm font-medium disabled:opacity-30 active:scale-[0.98] transition"
              >
                <PlusIcon size={14} /> add
              </button>
            </div>
          </div>
        </header>

        {/* Mobile top header */}
        <header className="lg:hidden flex items-center justify-between px-5 pt-6 pb-2">
          <h1 className="text-lg font-semibold lowercase">{title}</h1>
          <CurrencyToggle value={ccy} onChange={setCcy} />
        </header>

        <SetupBanner />

        {/* Content */}
        <main className="lg:max-w-3xl lg:mx-auto lg:px-8 lg:pt-8 pb-28 lg:pb-16">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-6 pt-3 pb-6 bg-gradient-to-t from-paper via-paper to-paper/0">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <Link
              href="/investments"
              className={`flex flex-col items-center gap-1 px-3 py-1 ${
                isInv ? "text-ink" : "text-muted"
              }`}
              aria-label="investments"
            >
              <IconChart active={!!isInv} />
              <span className="text-[11px]">investments</span>
            </Link>

            <button
              onClick={trigger}
              disabled={!ctx.hasHandler}
              className="w-14 h-14 -mt-7 rounded-full bg-ink text-paper grid place-items-center shadow-lg active:scale-95 transition disabled:opacity-40"
              aria-label="add"
            >
              <PlusIcon size={22} />
            </button>

            <Link
              href="/income"
              className={`flex flex-col items-center gap-1 px-3 py-1 ${
                isInc ? "text-ink" : "text-muted"
              }`}
              aria-label="income"
            >
              <IconWallet active={!!isInc} />
              <span className="text-[11px]">income</span>
            </Link>
          </div>
        </nav>
      </div>
    </AddContext.Provider>
  );
}

function SetupBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!supabaseConfigured());
  }, []);
  if (!show) return null;
  return (
    <div className="mx-5 lg:max-w-3xl lg:mx-auto lg:px-8 mt-3">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-3">
        <span className="font-semibold">supabase not configured.</span> add{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="font-mono">.env.local</code>, run{" "}
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
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition lowercase ${
        active ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
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
