import { useSyncExternalStore } from "react";
import { storage } from "./storage";
import { DEFAULT_THEME_ID, getThemeById, THEMES, type Theme } from "./themes";
import { DEFAULT_PAIN_SENSITIVITY } from "./goals";
import type { WeightUnit } from "./workouts";

/** The app is split into two independent trackers. Almost every preference
 *  (theme, data, calendar, backups) is scoped to one of them. */
export type AppSection = "supplements" | "workout";

export const SECTION_OPTIONS: { value: AppSection; label: string }[] = [
  { value: "supplements", label: "Supplements" },
  { value: "workout", label: "Workout" },
];

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

const DEFAULT_SECTION_KEY = "defaultSection";
const defaultSectionListeners = new Set<() => void>();
let defaultSectionCache: AppSection | null = null;

function readDefaultSection(): AppSection {
  return storage.getString(DEFAULT_SECTION_KEY) === "workout"
    ? "workout"
    : "supplements";
}

function getDefaultSectionSnapshot(): AppSection {
  if (defaultSectionCache === null) defaultSectionCache = readDefaultSection();
  return defaultSectionCache;
}

function subscribeDefaultSection(listener: () => void): () => void {
  defaultSectionListeners.add(listener);
  return () => {
    defaultSectionListeners.delete(listener);
  };
}

/** Which tab the app lands on at launch. Shared across both sections. */
export function useDefaultSection(): AppSection {
  return useSyncExternalStore(
    subscribeDefaultSection,
    getDefaultSectionSnapshot,
    getDefaultSectionSnapshot
  );
}

export function getDefaultSection(): AppSection {
  return getDefaultSectionSnapshot();
}

export function setDefaultSection(section: AppSection): void {
  defaultSectionCache = section;
  storage.set(DEFAULT_SECTION_KEY, section);
  for (const listener of defaultSectionListeners) listener();
}

/** Which section's settings are shown when the Settings tab opens. "none"
 *  leaves it on the neutral switcher, which is the original behaviour. */
export type SettingsDefault = AppSection | "none";

export const SETTINGS_DEFAULT_OPTIONS: {
	value: SettingsDefault;
	label: string;
}[] = [
	{ value: "none", label: "Neither" },
	{ value: "supplements", label: "Supplements" },
	{ value: "workout", label: "Workout" },
];

const SETTINGS_DEFAULT_KEY = "defaultSettingsSection";
const settingsDefaultListeners = new Set<() => void>();
let settingsDefaultCache: SettingsDefault | null = null;

function readSettingsDefault(): SettingsDefault {
	const value = storage.getString(SETTINGS_DEFAULT_KEY);
	return value === "supplements" || value === "workout" ? value : "none";
}

function getSettingsDefaultSnapshot(): SettingsDefault {
	if (settingsDefaultCache === null) {
		settingsDefaultCache = readSettingsDefault();
	}
	return settingsDefaultCache;
}

function subscribeSettingsDefault(listener: () => void): () => void {
	settingsDefaultListeners.add(listener);
	return () => {
		settingsDefaultListeners.delete(listener);
	};
}

export function useDefaultSettingsSection(): SettingsDefault {
	return useSyncExternalStore(
		subscribeSettingsDefault,
		getSettingsDefaultSnapshot,
		getSettingsDefaultSnapshot,
	);
}

export function setDefaultSettingsSection(value: SettingsDefault): void {
	settingsDefaultCache = value;
	storage.set(SETTINGS_DEFAULT_KEY, value);
	for (const listener of settingsDefaultListeners) listener();
}

const SHOW_GOALS_KEY = "showGoals";
const showGoalsListeners = new Set<() => void>();
let showGoalsCache: boolean | null = null;

function getShowGoalsSnapshot(): boolean {
	if (showGoalsCache === null) {
		showGoalsCache = storage.getBoolean(SHOW_GOALS_KEY) ?? false;
	}
	return showGoalsCache;
}

function subscribeShowGoals(listener: () => void): () => void {
	showGoalsListeners.add(listener);
	return () => {
		showGoalsListeners.delete(listener);
	};
}

export function useShowGoals(): boolean {
	return useSyncExternalStore(
		subscribeShowGoals,
		getShowGoalsSnapshot,
		getShowGoalsSnapshot,
	);
}

export function setShowGoals(value: boolean): void {
	showGoalsCache = value;
	storage.set(SHOW_GOALS_KEY, value);
	for (const listener of showGoalsListeners) listener();
}

const PAIN_SENSITIVITY_KEY = "painSensitivity";
const painSensitivityListeners = new Set<() => void>();
let painSensitivityCache: number | null = null;

function getPainSensitivitySnapshot(): number {
	if (painSensitivityCache === null) {
		const raw = storage.getString(PAIN_SENSITIVITY_KEY);
		const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
		painSensitivityCache = Number.isFinite(parsed)
			? Math.min(10, Math.max(0, parsed))
			: DEFAULT_PAIN_SENSITIVITY;
	}
	return painSensitivityCache;
}

function subscribePainSensitivity(listener: () => void): () => void {
	painSensitivityListeners.add(listener);
	return () => {
		painSensitivityListeners.delete(listener);
	};
}

/** How strongly pain readings steer the suggested goal. */
export function usePainSensitivity(): number {
	return useSyncExternalStore(
		subscribePainSensitivity,
		getPainSensitivitySnapshot,
		getPainSensitivitySnapshot,
	);
}

export function setPainSensitivity(value: number): void {
	painSensitivityCache = Math.min(10, Math.max(0, Math.round(value)));
	storage.set(PAIN_SENSITIVITY_KEY, String(painSensitivityCache));
	for (const listener of painSensitivityListeners) listener();
}

/** The equipment you actually own, so a suggested weight is one you can load.
 *  Held per unit rather than converted: someone with 5/10/15 lb dumbbells
 *  shouldn't be shown a 2.2 lb option, and vice versa. */
export const MAX_AVAILABLE_WEIGHT = 50;

const weightsListeners = new Set<() => void>();
const weightsCache: Partial<Record<WeightUnit, number[]>> = {};
const weightsKey = (unit: WeightUnit) => `availableWeights:${unit}`;

export function getAvailableWeights(unit: WeightUnit): number[] {
	const cached = weightsCache[unit];
	if (cached) return cached;
	let parsed: number[] = [];
	try {
		const raw = storage.getString(weightsKey(unit));
		const list = raw ? JSON.parse(raw) : [];
		if (Array.isArray(list)) {
			parsed = [
				...new Set(
					list.filter(
						(n): n is number =>
							typeof n === "number" &&
							Number.isInteger(n) &&
							n >= 1 &&
							n <= MAX_AVAILABLE_WEIGHT,
					),
				),
			].sort((a, b) => a - b);
		}
	} catch {
		parsed = [];
	}
	weightsCache[unit] = parsed;
	return parsed;
}

function subscribeWeights(listener: () => void): () => void {
	weightsListeners.add(listener);
	return () => {
		weightsListeners.delete(listener);
	};
}

export function useAvailableWeights(unit: WeightUnit): number[] {
	return useSyncExternalStore(
		subscribeWeights,
		() => getAvailableWeights(unit),
		() => getAvailableWeights(unit),
	);
}

export function toggleAvailableWeight(unit: WeightUnit, value: number): void {
	const current = getAvailableWeights(unit);
	const next = current.includes(value)
		? current.filter((n) => n !== value)
		: [...current, value].sort((a, b) => a - b);
	weightsCache[unit] = next;
	storage.set(weightsKey(unit), JSON.stringify(next));
	for (const listener of weightsListeners) listener();
}

export function clearAvailableWeights(unit: WeightUnit): void {
	weightsCache[unit] = [];
	storage.set(weightsKey(unit), JSON.stringify([]));
	for (const listener of weightsListeners) listener();
}

const sectionListeners = new Set<() => void>();
let activeSection: AppSection | null = null;

function getActiveSectionSnapshot(): AppSection {
  if (activeSection === null) activeSection = getDefaultSection();
  return activeSection;
}

function subscribeSection(listener: () => void): () => void {
  sectionListeners.add(listener);
  return () => {
    sectionListeners.delete(listener);
  };
}

/** The section currently being viewed. Not persisted — it follows the tab bar
 *  (and the switcher in Settings) and starts on the default section. */
export function useActiveSection(): AppSection {
  return useSyncExternalStore(
    subscribeSection,
    getActiveSectionSnapshot,
    getActiveSectionSnapshot
  );
}

export function getActiveSection(): AppSection {
  return getActiveSectionSnapshot();
}

export function setActiveSection(section: AppSection): void {
  if (getActiveSectionSnapshot() === section) return;
  activeSection = section;
  for (const listener of sectionListeners) listener();
}

const THEME_KEYS: Record<AppSection, string> = {
  supplements: "themeId",
  workout: "themeId:workout",
};

const themeListeners = new Set<() => void>();
const themeCache: Partial<Record<AppSection, string>> = {};

function readThemeId(section: AppSection): string {
  const value = storage.getString(THEME_KEYS[section]);
  return value && THEMES.some((t) => t.id === value) ? value : DEFAULT_THEME_ID;
}

function getThemeIdFor(section: AppSection): string {
  const cached = themeCache[section];
  if (cached !== undefined) return cached;
  const value = readThemeId(section);
  themeCache[section] = value;
  return value;
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

/** Both sections pick from the same theme list, but each remembers its own. */
export function useSectionThemeId(section: AppSection): string {
  return useSyncExternalStore(
    subscribeTheme,
    () => getThemeIdFor(section),
    () => getThemeIdFor(section)
  );
}

export function useThemeId(): string {
  return useSectionThemeId(useActiveSection());
}

export function useTheme(): Theme {
  return getThemeById(useThemeId());
}

export function useSectionTheme(section: AppSection): Theme {
  return getThemeById(useSectionThemeId(section));
}

export function setThemeId(section: AppSection, id: string): void {
  themeCache[section] = id;
  storage.set(THEME_KEYS[section], id);
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

const WEIGHT_UNIT_KEY = "weightUnit";
const weightUnitListeners = new Set<() => void>();
let weightUnitCache: WeightUnit | null = null;

function readWeightUnit(): WeightUnit {
  return storage.getString(WEIGHT_UNIT_KEY) === "lbs" ? "lbs" : "kg";
}

function getWeightUnitSnapshot(): WeightUnit {
  if (weightUnitCache === null) weightUnitCache = readWeightUnit();
  return weightUnitCache;
}

function subscribeWeightUnit(listener: () => void): () => void {
  weightUnitListeners.add(listener);
  return () => {
    weightUnitListeners.delete(listener);
  };
}

/** Display unit only — recorded sets keep the unit they were entered in. */
export function useWeightUnit(): WeightUnit {
  return useSyncExternalStore(
    subscribeWeightUnit,
    getWeightUnitSnapshot,
    getWeightUnitSnapshot
  );
}

export function getWeightUnit(): WeightUnit {
  return getWeightUnitSnapshot();
}

export function setWeightUnit(unit: WeightUnit): void {
  weightUnitCache = unit;
  storage.set(WEIGHT_UNIT_KEY, unit);
  for (const listener of weightUnitListeners) listener();
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
