import { vars } from "nativewind";

export interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  palette: ThemePalette;
}

export const THEMES: Theme[] = [
  {
    id: "midnight-emerald",
    name: "Midnight Emerald",
    dark: true,
    palette: {
      background: "222 20% 8%",
      foreground: "210 24% 92%",
      card: "222 18% 12%",
      cardForeground: "210 24% 92%",
      popover: "222 18% 11%",
      popoverForeground: "210 24% 92%",
      primary: "158 64% 50%",
      primaryForeground: "160 45% 8%",
      secondary: "222 14% 17%",
      secondaryForeground: "210 24% 92%",
      muted: "222 14% 16%",
      mutedForeground: "217 12% 58%",
      accent: "222 14% 20%",
      accentForeground: "210 24% 92%",
      destructive: "351 55% 62%",
      destructiveForeground: "210 24% 98%",
      border: "222 14% 19%",
      input: "222 14% 22%",
      ring: "158 64% 50%",
    },
  },
  {
    id: "royal-indigo",
    name: "Royal Indigo",
    dark: true,
    palette: {
      background: "240 24% 9%",
      foreground: "240 24% 94%",
      card: "240 20% 13%",
      cardForeground: "240 24% 94%",
      popover: "240 20% 12%",
      popoverForeground: "240 24% 94%",
      primary: "250 70% 66%",
      primaryForeground: "0 0% 100%",
      secondary: "240 16% 18%",
      secondaryForeground: "240 24% 94%",
      muted: "240 16% 17%",
      mutedForeground: "240 10% 62%",
      accent: "240 16% 21%",
      accentForeground: "240 24% 94%",
      destructive: "351 60% 64%",
      destructiveForeground: "0 0% 100%",
      border: "240 16% 20%",
      input: "240 16% 23%",
      ring: "250 70% 66%",
    },
  },
  {
    id: "crimson-noir",
    name: "Crimson Noir",
    dark: true,
    palette: {
      background: "0 12% 8%",
      foreground: "0 0% 93%",
      card: "0 10% 12%",
      cardForeground: "0 0% 93%",
      popover: "0 10% 11%",
      popoverForeground: "0 0% 93%",
      primary: "2 72% 56%",
      primaryForeground: "0 0% 100%",
      secondary: "0 8% 17%",
      secondaryForeground: "0 0% 93%",
      muted: "0 8% 16%",
      mutedForeground: "0 6% 60%",
      accent: "0 8% 20%",
      accentForeground: "0 0% 93%",
      destructive: "28 80% 55%",
      destructiveForeground: "0 0% 100%",
      border: "0 8% 19%",
      input: "0 8% 22%",
      ring: "2 72% 56%",
    },
  },
  {
    id: "amber-dusk",
    name: "Amber Dusk",
    dark: true,
    palette: {
      background: "28 18% 9%",
      foreground: "35 30% 92%",
      card: "28 16% 13%",
      cardForeground: "35 30% 92%",
      popover: "28 16% 12%",
      popoverForeground: "35 30% 92%",
      primary: "38 92% 56%",
      primaryForeground: "30 50% 10%",
      secondary: "28 12% 18%",
      secondaryForeground: "35 30% 92%",
      muted: "28 12% 17%",
      mutedForeground: "32 12% 60%",
      accent: "28 12% 21%",
      accentForeground: "35 30% 92%",
      destructive: "0 60% 60%",
      destructiveForeground: "0 0% 100%",
      border: "28 12% 20%",
      input: "28 12% 23%",
      ring: "38 92% 56%",
    },
  },
  {
    id: "evergreen",
    name: "Evergreen",
    dark: true,
    palette: {
      background: "150 16% 8%",
      foreground: "140 18% 92%",
      card: "150 14% 12%",
      cardForeground: "140 18% 92%",
      popover: "150 14% 11%",
      popoverForeground: "140 18% 92%",
      primary: "142 60% 46%",
      primaryForeground: "0 0% 100%",
      secondary: "150 10% 17%",
      secondaryForeground: "140 18% 92%",
      muted: "150 10% 16%",
      mutedForeground: "145 8% 58%",
      accent: "150 10% 20%",
      accentForeground: "140 18% 92%",
      destructive: "351 55% 62%",
      destructiveForeground: "0 0% 100%",
      border: "150 10% 19%",
      input: "150 10% 22%",
      ring: "142 60% 46%",
    },
  },
  {
    id: "deep-sea",
    name: "Deep Sea",
    dark: true,
    palette: {
      background: "205 35% 8%",
      foreground: "200 28% 92%",
      card: "205 30% 12%",
      cardForeground: "200 28% 92%",
      popover: "205 30% 11%",
      popoverForeground: "200 28% 92%",
      primary: "189 80% 50%",
      primaryForeground: "200 60% 8%",
      secondary: "205 22% 17%",
      secondaryForeground: "200 28% 92%",
      muted: "205 22% 16%",
      mutedForeground: "200 14% 60%",
      accent: "205 22% 20%",
      accentForeground: "200 28% 92%",
      destructive: "351 60% 62%",
      destructiveForeground: "0 0% 100%",
      border: "205 22% 19%",
      input: "205 22% 22%",
      ring: "189 80% 50%",
    },
  },
  {
    id: "orchid",
    name: "Orchid",
    dark: true,
    palette: {
      background: "280 20% 9%",
      foreground: "290 20% 93%",
      card: "280 18% 13%",
      cardForeground: "290 20% 93%",
      popover: "280 18% 12%",
      popoverForeground: "290 20% 93%",
      primary: "300 62% 64%",
      primaryForeground: "0 0% 100%",
      secondary: "280 14% 18%",
      secondaryForeground: "290 20% 93%",
      muted: "280 14% 17%",
      mutedForeground: "285 10% 62%",
      accent: "280 14% 21%",
      accentForeground: "290 20% 93%",
      destructive: "351 60% 64%",
      destructiveForeground: "0 0% 100%",
      border: "280 14% 20%",
      input: "280 14% 23%",
      ring: "300 62% 64%",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    dark: true,
    palette: {
      background: "215 16% 11%",
      foreground: "210 16% 94%",
      card: "215 14% 15%",
      cardForeground: "210 16% 94%",
      popover: "215 14% 14%",
      popoverForeground: "210 16% 94%",
      primary: "210 16% 74%",
      primaryForeground: "215 25% 12%",
      secondary: "215 12% 20%",
      secondaryForeground: "210 16% 94%",
      muted: "215 12% 18%",
      mutedForeground: "215 10% 60%",
      accent: "215 12% 23%",
      accentForeground: "210 16% 94%",
      destructive: "351 55% 62%",
      destructiveForeground: "0 0% 100%",
      border: "215 12% 22%",
      input: "215 12% 25%",
      ring: "210 16% 74%",
    },
  },
  {
    id: "neon-noir",
    name: "Neon Noir",
    dark: true,
    palette: {
      background: "0 0% 4%",
      foreground: "0 0% 95%",
      card: "0 0% 8%",
      cardForeground: "0 0% 95%",
      popover: "0 0% 7%",
      popoverForeground: "0 0% 95%",
      primary: "160 90% 50%",
      primaryForeground: "0 0% 6%",
      secondary: "0 0% 14%",
      secondaryForeground: "0 0% 95%",
      muted: "0 0% 13%",
      mutedForeground: "0 0% 60%",
      accent: "0 0% 17%",
      accentForeground: "0 0% 95%",
      destructive: "0 75% 58%",
      destructiveForeground: "0 0% 100%",
      border: "0 0% 16%",
      input: "0 0% 19%",
      ring: "160 90% 50%",
    },
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    dark: true,
    palette: {
      background: "340 16% 9%",
      foreground: "340 14% 93%",
      card: "340 14% 13%",
      cardForeground: "340 14% 93%",
      popover: "340 14% 12%",
      popoverForeground: "340 14% 93%",
      primary: "340 75% 68%",
      primaryForeground: "340 40% 12%",
      secondary: "340 10% 18%",
      secondaryForeground: "340 14% 93%",
      muted: "340 10% 17%",
      mutedForeground: "340 8% 62%",
      accent: "340 10% 21%",
      accentForeground: "340 14% 93%",
      destructive: "10 70% 60%",
      destructiveForeground: "0 0% 100%",
      border: "340 10% 20%",
      input: "340 10% 23%",
      ring: "340 75% 68%",
    },
  },
  {
    id: "refined-silver",
    name: "Refined Silver",
    dark: true,
    palette: {
      background: "220 12% 8%",
      foreground: "210 16% 93%",
      card: "220 12% 11%",
      cardForeground: "210 16% 93%",
      popover: "220 12% 10%",
      popoverForeground: "210 16% 93%",
      primary: "210 16% 82%",
      primaryForeground: "220 18% 12%",
      secondary: "220 10% 16%",
      secondaryForeground: "210 16% 93%",
      muted: "220 10% 15%",
      mutedForeground: "215 10% 62%",
      accent: "220 10% 19%",
      accentForeground: "210 16% 93%",
      destructive: "350 56% 58%",
      destructiveForeground: "210 16% 98%",
      border: "220 10% 18%",
      input: "220 10% 21%",
      ring: "210 16% 82%",
    },
  },
  {
    id: "refined-gold",
    name: "Refined Gold",
    dark: true,
    palette: {
      background: "30 10% 6%",
      foreground: "36 22% 94%",
      card: "30 10% 9%",
      cardForeground: "36 22% 94%",
      popover: "30 10% 8%",
      popoverForeground: "36 22% 94%",
      primary: "38 42% 62%",
      primaryForeground: "30 14% 10%",
      secondary: "30 8% 14%",
      secondaryForeground: "36 22% 94%",
      muted: "30 8% 14%",
      mutedForeground: "38 12% 62%",
      accent: "30 8% 16%",
      accentForeground: "36 22% 94%",
      destructive: "350 58% 56%",
      destructiveForeground: "36 22% 94%",
      border: "30 8% 18%",
      input: "30 8% 18%",
      ring: "38 42% 62%",
    },
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getThemeById(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function hsl(triplet: string): string {
  const [h, s, l] = triplet.trim().split(/\s+/);
  return `hsl(${h}, ${s}, ${l})`;
}

/** Rotates a palette colour around the wheel so it stays in keeping with the
 *  theme while reading as a clearly different colour. */
export function hslShifted(triplet: string, degrees: number): string {
  const [h, s, l] = triplet.trim().split(/\s+/);
  const hue = (Number.parseFloat(h) + degrees + 360) % 360;
  return `hsl(${hue}, ${s}, ${l})`;
}

/** Fixed marker colours for the standout sets, so each one means the same thing
 *  whichever theme is active. Hues are spread apart to stay distinguishable as
 *  thin borders. */
export const SET_MARKER_COLORS = {
  pb: "#f43f5e",
  both: "#a855f7",
  weight: "#f59e0b",
  reps: "#38bdf8",
} as const;

export function themeVars(theme: Theme) {
  const p = theme.palette;
  return vars({
    "--background": p.background,
    "--foreground": p.foreground,
    "--card": p.card,
    "--card-foreground": p.cardForeground,
    "--popover": p.popover,
    "--popover-foreground": p.popoverForeground,
    "--primary": p.primary,
    "--primary-foreground": p.primaryForeground,
    "--secondary": p.secondary,
    "--secondary-foreground": p.secondaryForeground,
    "--muted": p.muted,
    "--muted-foreground": p.mutedForeground,
    "--accent": p.accent,
    "--accent-foreground": p.accentForeground,
    "--destructive": p.destructive,
    "--destructive-foreground": p.destructiveForeground,
    "--border": p.border,
    "--input": p.input,
    "--ring": p.ring,
    "--radius": "0.85rem",
  });
}

export function navColors(theme: Theme) {
  const p = theme.palette;
  return {
    background: hsl(p.background),
    card: hsl(p.background),
    border: hsl(p.border),
    primary: hsl(p.primary),
    text: hsl(p.foreground),
    notification: hsl(p.destructive),
  };
}
