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

const SHOW_UNSCHEDULED_KEY = "showUnscheduled";
const showUnscheduledListeners = new Set<() => void>();
let showUnscheduledCache: boolean | null = null;

function readShowUnscheduled(): boolean {
  const value = storage.getBoolean(SHOW_UNSCHEDULED_KEY);
  return value === undefined ? true : value;
}

function getShowUnscheduledSnapshot(): boolean {
  if (showUnscheduledCache === null) showUnscheduledCache = readShowUnscheduled();
  return showUnscheduledCache;
}

function subscribeShowUnscheduled(listener: () => void): () => void {
  showUnscheduledListeners.add(listener);
  return () => {
    showUnscheduledListeners.delete(listener);
  };
}

export function useShowUnscheduled(): boolean {
  return useSyncExternalStore(
    subscribeShowUnscheduled,
    getShowUnscheduledSnapshot,
    getShowUnscheduledSnapshot
  );
}

export function setShowUnscheduled(value: boolean): void {
  showUnscheduledCache = value;
  storage.set(SHOW_UNSCHEDULED_KEY, value);
  for (const listener of showUnscheduledListeners) listener();
}

const AUTO_UPDATE_KEY = "autoUpdate";
const autoUpdateListeners = new Set<() => void>();
let autoUpdateCache: boolean | null = null;

function readAutoUpdate(): boolean {
  const value = storage.getBoolean(AUTO_UPDATE_KEY);
  return value === undefined ? true : value;
}

function getAutoUpdateSnapshot(): boolean {
  if (autoUpdateCache === null) autoUpdateCache = readAutoUpdate();
  return autoUpdateCache;
}

function subscribeAutoUpdate(listener: () => void): () => void {
  autoUpdateListeners.add(listener);
  return () => {
    autoUpdateListeners.delete(listener);
  };
}

export function useAutoUpdate(): boolean {
  return useSyncExternalStore(
    subscribeAutoUpdate,
    getAutoUpdateSnapshot,
    getAutoUpdateSnapshot
  );
}

export function getAutoUpdate(): boolean {
  return getAutoUpdateSnapshot();
}

export function setAutoUpdate(value: boolean): void {
  autoUpdateCache = value;
  storage.set(AUTO_UPDATE_KEY, value);
  for (const listener of autoUpdateListeners) listener();
}
