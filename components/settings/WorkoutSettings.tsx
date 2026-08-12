import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Text, cn } from "@/components/ui";
import {
  ChevronDownIcon,
  DumbbellIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "@/components/ui/lib/icons";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import {
  ActionRow,
  Divider,
  SectionLabel,
  Segmented,
  SettingsCard,
  ThemePicker,
} from "@/components/settings/SettingsPrimitives";
import {
  setThemeId,
  setWeightUnit,
  useSectionThemeId,
  useWeightUnit,
} from "@/lib/preferences";
import { THEMES } from "@/lib/themes";
import {
  EXPORT_RANGES,
  type ExportRange,
  WEIGHT_UNIT_OPTIONS,
  buildWorkoutCsv,
  buildWorkoutExport,
  clearAllWorkouts,
  formatElapsed,
  generateMockWorkouts,
  getExercises,
  getMonths,
  importWorkoutsFromCsv,
  importWorkoutsFromJson,
  lastSetFor,
  recentMonthKeys,
  setsForRange,
  setsInMonths,
  useWorkoutSelector,
} from "@/lib/workouts";

export function WorkoutSettings() {
  const unit = useWeightUnit();
  const activeThemeId = useSectionThemeId("workout");

  const [busy, setBusy] = React.useState<"export" | "import" | null>(null);
  const [dataOpen, setDataOpen] = React.useState(false);
  const [themesOpen, setThemesOpen] = React.useState(false);
  const [backupOpen, setBackupOpen] = React.useState(false);
  const [debugOpen, setDebugOpen] = React.useState(false);
  const [range, setRange] = React.useState<ExportRange>("all");

  const activeThemeName =
    THEMES.find((t) => t.id === activeThemeId)?.name ?? "Default";

  const exercises = useWorkoutSelector(() => getExercises());
  const months = useWorkoutSelector(() => getMonths());
  const recentSets = useWorkoutSelector(() => setsInMonths(recentMonthKeys(2)));

  const breakdown = useWorkoutSelector(
    () =>
      exercises
        .map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: recentSets.filter((s) => s.exerciseId === exercise.id).length,
          last: lastSetFor(exercise.id),
        }))
        .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name)),
    [exercises, recentSets]
  );

  const handleExport = async (format: "json" | "csv") => {
    if (busy) return;
    const count = setsForRange(range).length;
    if (count === 0) {
      Alert.alert(
        "Nothing to export",
        "There are no sets recorded in the selected range."
      );
      return;
    }

    setBusy("export");
    try {
      const content =
        format === "json"
          ? JSON.stringify(buildWorkoutExport(range), null, 2)
          : buildWorkoutCsv(range);
      const stamp = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}supplementary-workouts-${range}-${stamp}.${format}`;
      await FileSystem.writeAsStringAsync(uri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: format === "json" ? "application/json" : "text/csv",
          dialogTitle: "Export workout data",
          UTI:
            format === "json"
              ? "public.json"
              : "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Saved", `${count} sets written to:\n${uri}`);
      }
    } catch (error) {
      Alert.alert("Export failed", String(error));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy("import");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          "application/json",
          "text/csv",
          "text/comma-separated-values",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) {
        setBusy(null);
        return;
      }

      const asset = picked.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Trust the extension when there is one, otherwise sniff the content.
      const name = (asset.name ?? "").toLowerCase();
      const trimmed = content.trimStart();
      const isJson = name.endsWith(".json")
        ? true
        : name.endsWith(".csv")
          ? false
          : trimmed.startsWith("{") || trimmed.startsWith("[");

      const outcome = isJson
        ? importWorkoutsFromJson(content)
        : importWorkoutsFromCsv(content);

      if (!outcome.ok) {
        Alert.alert("Import failed", outcome.error ?? "Unknown error.");
        return;
      }

      const details = [
        `${outcome.added} set${outcome.added === 1 ? "" : "s"} added`,
        outcome.skipped > 0 ? `${outcome.skipped} duplicate skipped` : null,
        outcome.exercisesAdded > 0
          ? `${outcome.exercisesAdded} new exercise${outcome.exercisesAdded === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean);
      Alert.alert("Import complete", `${details.join(" · ")}.`);
    } catch (error) {
      Alert.alert("Import failed", String(error));
    } finally {
      setBusy(null);
    }
  };

  const handleGenerateMock = () => {
    Alert.alert(
      "Generate mock data?",
      "This replaces all current exercises and sets with about four months of sample training history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: () => {
            const result = generateMockWorkouts();
            Alert.alert(
              "Done",
              `Generated ${result.sets} sets across ${result.exercises} exercises.`
            );
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (exercises.length === 0 && months.length === 0) {
      Alert.alert("Nothing to clear", "There is no workout data stored.");
      return;
    }
    Alert.alert(
      "Clear all workout data?",
      "This permanently removes every exercise and set on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear all", style: "destructive", onPress: clearAllWorkouts },
      ]
    );
  };

  return (
    <View>
      <SectionLabel>About your data</SectionLabel>
      <SettingsCard>
        <Pressable
          onPress={() => setDataOpen((open) => !open)}
          className="flex-row items-center gap-3 p-4 active:bg-secondary"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <DumbbellIcon className="h-5 w-5 text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-medium">
              {exercises.length} exercise{exercises.length === 1 ? "" : "s"}{" "}
              tracked
            </Text>
            <Text variant="muted" className="text-xs">
              {months.length} month{months.length === 1 ? "" : "s"} of history ·
              tap for a breakdown
            </Text>
          </View>
          <ChevronDownIcon
            className={cn(
              "h-5 w-5 text-muted-foreground",
              dataOpen && "rotate-180"
            )}
          />
        </Pressable>

        {dataOpen ? (
          <View>
            <Divider />
            <View className="p-4">
              <Text
                variant="muted"
                className="text-xs uppercase tracking-widest"
              >
                Sets in the last 2 months
              </Text>
              <Text variant="h2" className="mt-1 text-primary">
                {recentSets.length}
              </Text>

              {breakdown.length > 0 ? (
                <View className="mt-4 gap-2">
                  {breakdown.map((entry) => (
                    <View
                      key={entry.id}
                      className="flex-row items-center justify-between"
                    >
                      <Text
                        variant="small"
                        numberOfLines={1}
                        className="flex-1 pr-3 text-foreground"
                      >
                        {entry.name}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {entry.sets} set{entry.sets === 1 ? "" : "s"}
                        {entry.last
                          ? ` · ${formatElapsed(Date.now() - entry.last.at)} ago`
                          : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text variant="muted" className="mt-3 text-xs leading-5">
                  Add an exercise on the Workout tab and record a set to see a
                  breakdown here.
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </SettingsCard>

      <SectionLabel className="mt-6">History</SectionLabel>
      <WorkoutCalendar />

      <SectionLabel className="mt-6">Preferences</SectionLabel>
      <SettingsCard>
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-1 pr-3">
            <Text className="font-medium">Weight unit</Text>
            <Text variant="muted" className="text-xs leading-5">
              Sets keep the unit they were recorded in — this only changes how
              they&apos;re displayed, converted to match.
            </Text>
          </View>
          <Segmented
            options={WEIGHT_UNIT_OPTIONS}
            value={unit}
            onChange={setWeightUnit}
          />
        </View>
      </SettingsCard>

      <SectionLabel className="mt-6">Themes</SectionLabel>
      <SettingsCard>
        <Pressable
          onPress={() => setThemesOpen((open) => !open)}
          className="flex-row items-center gap-3 p-4 active:bg-secondary"
        >
          <View className="flex-1">
            <Text className="font-medium">Appearance</Text>
            <Text variant="muted" className="text-xs">
              {activeThemeName} · applies to Workout only
            </Text>
          </View>
          <ChevronDownIcon
            className={cn(
              "h-5 w-5 text-muted-foreground",
              themesOpen && "rotate-180"
            )}
          />
        </Pressable>

        {themesOpen ? (
          <View>
            <Divider />
            <ThemePicker
              activeThemeId={activeThemeId}
              onSelect={(id) => setThemeId("workout", id)}
            />
          </View>
        ) : null}
      </SettingsCard>

      <SectionLabel className="mt-6">Backup</SectionLabel>
      <SettingsCard>
        <Pressable
          onPress={() => setBackupOpen((open) => !open)}
          className="flex-row items-center gap-3 p-4 active:bg-secondary"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <FileSpreadsheetIcon className="h-5 w-5 text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-medium">Export data</Text>
            <Text variant="muted" className="text-xs">
              Choose a range, then export as JSON or CSV
            </Text>
          </View>
          <ChevronDownIcon
            className={cn(
              "h-5 w-5 text-muted-foreground",
              backupOpen && "rotate-180"
            )}
          />
        </Pressable>

        {backupOpen ? (
          <View>
            <Divider />
            <View className="p-4">
              <Text
                variant="muted"
                className="mb-2 text-xs uppercase tracking-widest"
              >
                Range
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {EXPORT_RANGES.map((option) => {
                  const active = option.value === range;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setRange(option.value)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5",
                        active
                          ? "border-primary bg-primary"
                          : "border-border bg-secondary"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-medium",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => handleExport("json")}
                  disabled={busy !== null}
                  className={cn(
                    "flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 active:opacity-80",
                    busy !== null && "opacity-50"
                  )}
                >
                  <FileJsonIcon className="h-5 w-5 text-primary-foreground" />
                  <Text className="font-semibold text-primary-foreground">
                    JSON
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleExport("csv")}
                  disabled={busy !== null}
                  className={cn(
                    "flex-1 flex-row items-center justify-center gap-2 rounded-full border border-border px-4 py-3 active:bg-secondary",
                    busy !== null && "opacity-50"
                  )}
                >
                  <FileSpreadsheetIcon className="h-5 w-5 text-foreground" />
                  <Text className="font-semibold text-foreground">CSV</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <Divider />

        <ActionRow
          icon={<UploadIcon className="h-5 w-5 text-primary" />}
          title="Import data"
          subtitle="Load sets from a JSON or CSV file"
          onPress={handleImport}
          loading={busy === "import"}
          disabled={busy !== null}
        />
      </SettingsCard>
      <Text variant="muted" className="mt-2 px-1 text-xs leading-5">
        Importing merges into what you already have — sets that are already
        recorded are skipped, so re-importing the same file is safe.
      </Text>

      <SectionLabel className="mt-8">Debug</SectionLabel>
      <SettingsCard>
        <Pressable
          onPress={() => setDebugOpen((open) => !open)}
          className="flex-row items-center gap-3 p-4 active:bg-secondary"
        >
          <View className="flex-1">
            <Text className="font-medium">Developer tools</Text>
            <Text variant="muted" className="text-xs">
              Seed sample training data and reset storage
            </Text>
          </View>
          <ChevronDownIcon
            className={cn(
              "h-5 w-5 text-muted-foreground",
              debugOpen && "rotate-180"
            )}
          />
        </Pressable>

        {debugOpen ? (
          <View>
            <Divider />
            <ActionRow
              icon={<RefreshCwIcon className="h-5 w-5 text-primary" />}
              title="Generate mock data"
              subtitle="Replace with ~4 months of sample sessions"
              onPress={handleGenerateMock}
              disabled={busy !== null}
            />
            <Divider />
            <ActionRow
              icon={<Trash2Icon className="h-5 w-5 text-destructive" />}
              title="Clear all workout data"
              subtitle="Remove every exercise and recorded set"
              onPress={handleClearAll}
              disabled={busy !== null}
            />
          </View>
        ) : null}
      </SettingsCard>
    </View>
  );
}
