# Supplementary

A calm, private supplement tracker built with Expo and React Native.

Supplementary helps you track what to take each day, monitor remaining supply, and estimate monthly supplement costs, all with local, on-device storage.

## Highlights

- Daily supplement tracking with one-tap taken/undo actions
- Flexible scheduling by weekday
- Supply projection with run-out estimates
- Cost estimation per dose and per month
- History calendar with day-level intake details
- Currency support (GBP and USD)
- Theme customization
- JSON backup and restore (export/import)
- Debug actions for mock data and full reset (in-app)

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
- `app/(tabs)/settings.tsx` - Preferences, history, backup/restore, debug actions
- `components/SupplementForm.tsx` - Create/edit supplement modal
- `components/SupplementCard.tsx` - Supplement status card with supply and cost indicators
- `components/HistoryCalendar.tsx` - Intake history calendar
- `lib/supplements.ts` - Core supplement domain logic and storage operations
- `lib/preferences.ts` - Currency and theme preferences
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

## Backup and Restore

Use the in-app Settings screen:

- Export creates a JSON backup file for sharing/safekeeping
- Import restores from JSON and replaces current local data

Tip: export a backup before importing.

## Development Notes

- Routing is file-based under `app/`
- Theme and currency preferences are reactive via `useSyncExternalStore`
- Supplement state is managed locally and persisted through MMKV

## License

Private project. All rights reserved.
