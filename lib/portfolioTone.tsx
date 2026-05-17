"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type Tone = "positive" | "negative" | "neutral";

type Ctx = {
  tone: Tone;
  setTone: (t: Tone) => void;
};

const PortfolioToneContext = createContext<Ctx | null>(null);

export function PortfolioToneProvider({ children }: { children: ReactNode }) {
  const [tone, setToneState] = useState<Tone>("neutral");
  const setTone = useCallback((t: Tone) => setToneState(t), []);
  const value = useMemo(() => ({ tone, setTone }), [tone, setTone]);
  return (
    <PortfolioToneContext.Provider value={value}>
      {children}
    </PortfolioToneContext.Provider>
  );
}

export function usePortfolioTone(): Tone {
  const ctx = useContext(PortfolioToneContext);
  return ctx?.tone ?? "neutral";
}

export function useReportPortfolioTone(tone: Tone) {
  const ctx = useContext(PortfolioToneContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setTone(tone);
  }, [ctx, tone]);
}
