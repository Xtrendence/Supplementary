import { useSyncExternalStore } from "react";
import { storage } from "./storage";
import { DEFAULT_THEME_ID, getThemeById, THEMES, type Theme } from "./themes";

export type Currency = "GBP" | "USD";

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: "GBP", label: "GBP", symbol: "£" },
  { value: "USD", label: "USD", symbol: "$" },
];

const SYMBOLS: Record<Currency, string> = { GBP: "£", USD: "$" };

const KEY = "currency";
const DEFAULT_CURRENCY: Currency = "GBP";

const listeners = new Set<() => void>();
let cache: Currency | null = null;

function readFromDisk(): Currency {
  const value = storage.getString(KEY);
  return value === "GBP" || value === "USD" ? value : DEFAULT_CURRENCY;
}

function getSnapshot(): Currency {
  if (cache === null) cache = readFromDisk();
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCurrency(): Currency {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getCurrency(): Currency {
  return getSnapshot();
}

export function setCurrency(currency: Currency): void {
  cache = currency;
  storage.set(KEY, currency);
  for (const listener of listeners) listener();
}

export function currencySymbol(currency: Currency = getSnapshot()): string {
  return SYMBOLS[currency];
}

export function formatCurrency(
  amount: number,
  currency: Currency = getSnapshot()
): string {
  return `${SYMBOLS[currency]}${amount.toFixed(2)}`;
}

const THEME_KEY = "themeId";
const themeListeners = new Set<() => void>();
let themeCache: string | null = null;

function readThemeId(): string {
  const value = storage.getString(THEME_KEY);
  return value && THEMES.some((t) => t.id === value) ? value : DEFAULT_THEME_ID;
}

function getThemeIdSnapshot(): string {
  if (themeCache === null) themeCache = readThemeId();
  return themeCache;
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function useThemeId(): string {
  return useSyncExternalStore(subscribeTheme, getThemeIdSnapshot, getThemeIdSnapshot);
}

export function useTheme(): Theme {
  return getThemeById(useThemeId());
}

export function setThemeId(id: string): void {
  themeCache = id;
  storage.set(THEME_KEY, id);
  for (const listener of themeListeners) listener();
}
