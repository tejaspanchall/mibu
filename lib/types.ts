export type Currency = "USD" | "INR";

export type AssetType = "crypto" | "us" | "in";

export type Holding = {
  id: string;
  type: AssetType;
  symbol: string;
  ticker: string;
  name: string;
  logo?: string;
  currency: Currency;
  quantity: number;
  buyPrice: number;
  createdAt: string;
};

export type Income = {
  id: string;
  amount: number;
  currency: Currency;
  emoji: string;
  source: string;
  date: string;
  createdAt: string;
};

export type Quote = {
  symbol: string;
  price: number;
  currency: Currency;
};

export type SearchResult = {
  type: AssetType;
  symbol: string;
  ticker: string;
  name: string;
  logo?: string;
  currency: Currency;
};
