# Supplementary

<img src="./assets/images/icon.png" width="128" alt="Supplementary" />

![Downloads](https://img.shields.io/github/downloads/Xtrendence/Supplementary/total?style=flat-square)
![Release](https://img.shields.io/github/v/release/Xtrendence/Supplementary?style=flat-square)

*Based on GitHub Release downloads.*

### What is Supplementary?

Supplementary is a private, on-device supplement and training tracker for Android and iOS. It's split into two independent halves. **Supplements** keeps track of what you take each day, how much you have left, and what it costs you. **Workout** logs every set you lift, the pain or irritation it leaves behind, and suggests what to aim for next.

Nothing is shared between the two halves except the update checker and a couple of launch preferences — separate data, separate history, separate themes.

### Is it on the Google Play Store?

No. Supplementary is distributed as a sideloaded APK from the [Releases](https://github.com/Xtrendence/Supplementary/releases) section. The app checks GitHub for a newer release on launch (if you leave automatic updates on) and can download and install it for itself, which is why it asks for the "install unknown apps" permission.

### How do I install it?

Download the latest `.apk` from [Releases](https://github.com/Xtrendence/Supplementary/releases), open it on your phone, and allow the installer when Android asks. Every build is signed with the same key, so later versions install straight over earlier ones without touching your data.

### Is my data kept private?

Entirely. Everything lives in [MMKV](https://github.com/mrousavy/react-native-mmkv) on the device and never leaves it. There's no account, no backend, no analytics, and nothing to phone home to. The only outbound request the app ever makes is to the GitHub Releases API to see whether an update exists.

The flip side is that your data is only as safe as your phone. Exports are manual, so take one occasionally.

### What can the Supplements section do?

- Daily tracking with one-tap taken/undo, scheduled per weekday
- Doses left and a projected run-out date per supplement
- Cost per dose, plus estimated monthly and yearly spend
- A history calendar showing exactly what was taken, and when
- GBP or USD, and JSON backup/restore

### What can the Workout section do?

- A free-form exercise list, ordered by how recently you trained each one, with a live `1w 2d 3h 4m 5s` counter since the last set
- Sets logged by reps and weight, with an optional pace (slow, fast, as fast as possible) and a note
- Day-grouped set history, with the heaviest set, the highest-rep set, and your personal best each marked in their own colour
- Pain and irritation records on a 0–10 scale, with optional notes, tracked on rest days too
- A training calendar grouped by exercise, with one-tap copy of a day's session to the clipboard
- Twelve-month charts for volume, weight and pain — individually or overlaid — plus per-exercise progress charts
- Suggested goals worked out from your own history (see below)
- kg or lbs, and JSON/CSV export and import over a date range

### How are the goals calculated?

Goals are off by default and enabled under **Settings → Workout → Goals**. When on, each exercise gets a read-only card suggesting the next single set to beat. The suggestion looks at the last 42 days, up to five sessions, and works as double progression: add reps at the current weight until you reach the rep target, then take the smallest step up you can actually load.

Three things can override that:

|Signal                  |Effect                                                                       |
|------------------------|-----------------------------------------------------------------------------|
|Pain at the caution band|Reps only — never more weight                                                |
|Pain at the back-off band|Hold; repeat what you did at most                                            |
|Pain past the stop band |Drop to the next weight down and let it settle                               |
|Last top set was a grind|Never add weight, add a rep instead                                          |
|Last top set was easy   |Allow the weight step early, without waiting for a stall                     |

A few deliberate details:

- **The rep target is inferred, not fixed.** It's whatever you were managing at the *previous* weight, so if you moved off 8 kg once you hit 24 reps, the bar at 11 kg is 24 reps. Falls back to 15 when there's no earlier weight to learn from.
- **Reps after a weight step are carried by the Epley formula**, so 24 × 11 kg becomes roughly 15 × 14 kg rather than an arbitrary drop.
- **Suggestions only use weights you own.** Tell it which dumbbells or plates you have under **Weights you have** and it will never suggest a 9 kg you can't load. With nothing configured it infers the step from the smallest jump in your own history.
- **Pain sensitivity is adjustable.** The slider sets where the three bands fall; the default of 6 puts them at 3, 4 and 5, which suits a dull ache worth respecting long before it becomes a flare-up. Set it to 0 to ignore pain entirely.
- **A recent spike isn't averaged away.** The check takes the higher of the average pain in the 0–2 days after recent sessions and the worst reading in the last three days.

Every card states its reasoning, so the number is never mysterious — *"24 reps at 11 kg two sessions running — time to load up"*, or *"Pain hit 5/10 in the last few days — let it settle before training this again."*

### How is my data stored?

| Key | Holds |
|-----|-------|
|`supplements`|Every supplement and its taken log|
|`workout:exercises`|Exercise names|
|`workout:months`|Index of months holding sets|
|`workout:sets:YYYY-MM`|One bucket of sets per month|
|`pain:months`|Index of months holding pain records|
|`pain:entries:YYYY-MM`|One bucket of pain records per month|

Sets and pain records are bucketed by month so no single record grows without bound. An exercise screen only reads the current and previous month; anything older is reached through the calendar in Settings.

Weights are stored exactly as they were entered, along with the unit that was active at the time. Switching between kg and lbs only changes how they're displayed, never the underlying data.

### How do exports and imports work?

Both sections export from their own Settings. Supplement exports are JSON and importing replaces what's stored. Workout exports take a date range and write either JSON or CSV, and importing **merges** — records that are already stored are skipped, matched by count, so re-importing the same file changes nothing while genuinely repeated identical sets are all kept.

The CSV is one flat table with a `type` column, so a day can hold any number of pain records and a rest day can appear with no sets at all:

```csv
type,date,time,exercise,reps,weight,unit,speed,pain,note
set,2026-08-12,18:00:00,Chest Press,12,40,kg,2,,felt good
pain,2026-08-12,09:12:00,,,,,,3,left knee
pain,2026-08-13,10:00:00,,,,,,4,
```

Columns are matched by name rather than position, so third-party exports shaped like `Date, Exercise, Weight (kg), Reps, Type` import correctly too. Unknown columns are ignored, missing exercises are created, and the unit is read from the weight header when there's no unit column.

### What's the tech stack?

React Native via Expo, with file-based routing through Expo Router. Styling is NativeWind (Tailwind for React Native) over a set of twelve themes, each of which the two sections remember independently. Storage is MMKV, read through `useSyncExternalStore` so every screen stays in sync without a state library. The charts are hand-drawn with `react-native-svg` rather than a charting library, which is what makes the per-training-day rules and the normalised overlays possible.

### How do I build it myself?

You'll need Node 20+, npm 10+, and Android Studio or Xcode depending on the platform.

```bash
npm install
npm run dev          # Expo dev server, cache cleared
npm run android      # build and run on a connected device or emulator
npm run ios
```

To produce a release APK on your desktop:

```bash
npm run apk
```

That bumps the counter in `scripts/.apk-version`, runs `./gradlew assembleRelease`, and copies the result to your Desktop. Releases are also built by the `Release APK` GitHub Action, which stamps the version into `android/app/build.gradle` and publishes the APK to a tagged release.

| Script | Does |
|--------|------|
|`npm run start`|Start the Expo dev server|
|`npm run dev`|Start the dev server with the cache cleared|
|`npm run android` / `ios` / `web`|Build and run locally|
|`npm run lint`|Lint the project|
|`npm run apk`|Build a release APK and copy it to the Desktop|
|`npm run build:android` / `build:ios` / `build:all`|EAS builds|

### Please keep the following points in mind:

- Release builds are signed with the debug keystore committed to this repository. That keeps every build interchangeable, but it also means the signature is not a trust boundary, and the APK could not be published to Google Play as-is.
- All twelve themes are dark. There is no light mode yet.
- Your data lives on one device and exports are manual. There's no cloud backup.
- The in-app updater installs APKs directly, which Google Play does not allow — another reason this is distributed outside the store.
- A CSV without a `time` column stamps every row from that day at midday, so the order of sets within a day can't be recovered from such a file.

#### Attributions

|Resource|URL|
|--------|---|
|Expo|[NPM](https://www.npmjs.com/package/expo)|
|Expo Router|[NPM](https://www.npmjs.com/package/expo-router)|
|React|[NPM](https://www.npmjs.com/package/react)|
|React Native|[NPM](https://www.npmjs.com/package/react-native)|
|NativeWind|[NPM](https://www.npmjs.com/package/nativewind)|
|Tailwind CSS|[NPM](https://www.npmjs.com/package/tailwindcss)|
|React Native MMKV|[NPM](https://www.npmjs.com/package/react-native-mmkv)|
|React Native SVG|[NPM](https://www.npmjs.com/package/react-native-svg)|
|React Native Reanimated|[NPM](https://www.npmjs.com/package/react-native-reanimated)|
|React Native Gesture Handler|[NPM](https://www.npmjs.com/package/react-native-gesture-handler)|
|React Native Safe Area Context|[NPM](https://www.npmjs.com/package/react-native-safe-area-context)|
|Lucide Icons|[NPM](https://www.npmjs.com/package/lucide-react-native)|
|Class Variance Authority|[NPM](https://www.npmjs.com/package/class-variance-authority)|
|Tailwind Merge|[NPM](https://www.npmjs.com/package/tailwind-merge)|
|Expo Clipboard|[NPM](https://www.npmjs.com/package/expo-clipboard)|
|Expo Document Picker|[NPM](https://www.npmjs.com/package/expo-document-picker)|
|Expo File System|[NPM](https://www.npmjs.com/package/expo-file-system)|
|Expo Sharing|[NPM](https://www.npmjs.com/package/expo-sharing)|
|Expo Haptics|[NPM](https://www.npmjs.com/package/expo-haptics)|
|Expo Intent Launcher|[NPM](https://www.npmjs.com/package/expo-intent-launcher)|
|Expo Application|[NPM](https://www.npmjs.com/package/expo-application)|
|TypeScript|[NPM](https://www.npmjs.com/package/typescript)|

#### License

Private project. All rights reserved.
