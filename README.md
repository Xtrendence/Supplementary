# Supplementary

A calm, private supplement and workout tracker built with Expo and React Native.

Supplementary is split into two independent sections. **Supplements** tracks what to take each day, remaining supply and monthly cost. **Workout** logs every set you lift and how long it's been since you last trained each exercise. Both store their data locally, on device.

## Highlights

### Supplements

- Daily supplement tracking with one-tap taken/undo actions
- Flexible scheduling by weekday
- Supply projection with run-out estimates
- Cost estimation per dose and per month
- History calendar with day-level intake details
- Currency support (GBP and USD)
- JSON backup and restore (export/import)

### Workout

- Free-form exercise list with a live "time since last done" counter (`1w 2d 3h 4m 5s`)
- Set logging by reps and weight, grouped by day (Today / Yesterday / Sat. 8 Aug 2026)
- Heaviest set, highest-rep set and best-of-both highlighted on the cards
- Optional per-set notes, plus editing and deleting from a bottom sheet
- Weight shown in kg or lbs — sets keep the unit they were recorded in and are converted for display
- Last used weight is prefilled for the next set
- History calendar grouped by exercise, with one-tap copy of a day's session
- Export by date range as JSON or CSV, and import from either
- CSV import also accepts third-party exports such as `Date, Exercise, Weight (kg), Reps, Type`

### Shared

- Choice of which section the app opens on
- Per-section themes (same options, remembered separately)
- Debug actions for mock data and full reset (in-app)
- In-app update checks against GitHub releases

## Privacy First

Supplementary is designed to be private by default:

- Data is stored locally on your device using MMKV
- No backend or cloud sync is used by default
- Nothing leaves your device unless you explicitly export a backup file

## Tech Stack

- Expo SDK 54
- React 19 + React Native 0.81
- Expo Router (file-based navigation)
- NativeWind + Tailwind CSS utilities
- React Native MMKV for local persistence
- TypeScript

## App Structure

- `app/(tabs)/index.tsx` - Supplements list, daily actions, create/edit flow
- `app/(tabs)/workout.tsx` - Exercise list with time-since-last-done counters
- `app/exercise/[id].tsx` - Set entry and day-grouped set history for one exercise
- `app/(tabs)/settings.tsx` - Section switcher, shared preferences and updates
- `components/settings/SupplementSettings.tsx` - Everything scoped to Supplements
- `components/settings/WorkoutSettings.tsx` - Everything scoped to Workout
- `components/SupplementForm.tsx` - Create/edit supplement modal
- `components/SupplementCard.tsx` - Supplement status card with supply and cost indicators
- `components/HistoryCalendar.tsx` - Intake history calendar
- `components/WorkoutCalendar.tsx` - Training history calendar, grouped by exercise
- `components/SlideUpSheet.tsx` - Bottom-anchored sheet used by the workout editors
- `lib/supplements.ts` - Core supplement domain logic and storage operations
- `lib/workouts.ts` - Exercises, sets, month-bucketed storage, export/import
- `lib/preferences.ts` - Per-section themes plus currency, units and shared settings
- `lib/storage.ts` - MMKV storage instance

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Xcode (for iOS simulator/builds)
- Android Studio (for Android emulator/builds)
- Expo CLI tools (via `npx expo ...`)

### Install

```bash
npm install
```

### Run (Development)

```bash
npm run start
```

### Run on iOS / Android / Web

```bash
npm run ios
npm run android
npm run web
```

## Available Scripts

- `npm run start` - Start Expo dev server
- `npm run dev` - Start Expo dev server and clear cache
- `npm run ios` - Build and run iOS app locally
- `npm run android` - Build and run Android app locally
- `npm run web` - Run app in browser
- `npm run lint` - Run linting
- `npm run build:ios` - EAS iOS build
- `npm run build:android` - EAS Android build
- `npm run build:all` - EAS builds for all platforms

## Data Model (At a Glance)

### Supplements

Each supplement includes:

- Name, serving size, and unit (`g`, `mg`, `IU`, `pill`)
- Scheduled days of the week
- Container amount and amount left
- Price per container
- Taken history log with date and timestamp

This supports:

- Due-today calculations
- Daily completion state
- Doses-left and run-out projections
- Cost-per-dose and monthly total estimates

### Workouts

An exercise is just a name. Each recorded set includes:

- Reps and weight, with the unit it was entered in (`kg` or `lbs`)
- Date and timestamp
- An optional note

Sets are stored one bucket per month (`workout:sets:YYYY-MM`) with a small index
of which months hold data, so no single record grows without bound. An exercise
screen only reads the current and previous month; older sessions are reached
through the calendar in Settings.

## Backup and Restore

Use the in-app Settings screen, under the relevant section:

- Supplements export creates a JSON backup; importing replaces current local data
- Workout export takes a date range and writes JSON or CSV
- Workout import accepts JSON or CSV and merges, skipping sets already recorded
- CSV columns are matched by name, so both the app's own export
  (`date,time,exercise,reps,weight,unit,note`) and files shaped like
  `Date, Exercise, Weight (kg), Reps, Type` import correctly. Unknown columns are
  ignored, missing exercises are created, and the unit is read from the weight
  header when there's no unit column.

Tip: export a backup before importing supplements.

## Development Notes

- Routing is file-based under `app/`
- Theme and currency preferences are reactive via `useSyncExternalStore`
- Supplement state is managed locally and persisted through MMKV

## License

Private project. All rights reserved.
