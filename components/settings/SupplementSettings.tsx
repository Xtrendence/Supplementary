import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import { Switch, Text, cn } from "@/components/ui";
import {
  ChevronDownIcon,
  DownloadIcon,
  PillIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "@/components/ui/lib/icons";
import { HistoryCalendar } from "@/components/HistoryCalendar";
import {
  ActionRow,
  Divider,
  SectionLabel,
  Segmented,
  SettingsCard,
  ThemePicker,
} from "@/components/settings/SettingsPrimitives";
import {
  CURRENCY_OPTIONS,
  formatCurrency,
  setCurrency,
  setShowUnscheduled,
  setThemeId,
  useCurrency,
  useSectionThemeId,
  useShowUnscheduled,
} from "@/lib/preferences";
import {
  buildExportPayload,
  clearAllSupplements,
  generateMockData,
  importFromJson,
  monthlyCost,
  totalMonthlyCost,
  useSupplements,
} from "@/lib/supplements";
import { THEMES } from "@/lib/themes";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export function SupplementSettings() {
  const supplements = useSupplements();
  const currency = useCurrency();
  const activeThemeId = useSectionThemeId("supplements");
  const showUnscheduled = useShowUnscheduled();
  const [busy, setBusy] = React.useState<"export" | "import" | null>(null);
  const [debugOpen, setDebugOpen] = React.useState(false);
  const [dataOpen, setDataOpen] = React.useState(false);
  const [themesOpen, setThemesOpen] = React.useState(false);

  const activeThemeName =
    THEMES.find((t) => t.id === activeThemeId)?.name ?? "Default";

  const monthlyTotal = totalMonthlyCost(supplements);
  const costBreakdown = supplements
    .map((s) => ({ id: s.id, name: s.name, cost: monthlyCost(s) }))
    .filter((entry) => entry.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  const handleGenerateMock = () => {
    Alert.alert(
      "Generate mock data?",
      "This replaces all current supplements with 20 sample entries for testing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: () => {
            const count = generateMockData();
            Alert.alert("Done", `Generated ${count} mock supplements.`);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (supplements.length === 0) {
      Alert.alert("Nothing to clear", "There are no supplements stored.");
      return;
    }
    Alert.alert(
      "Clear all data?",
      "This permanently removes every supplement and its history on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: clearAllSupplements,
        },
      ]
    );
  };

  const handleExport = async () => {
    if (busy) return;
    setBusy("export");
    try {
      const payload = buildExportPayload();
      const json = JSON.stringify(payload, null, 2);
      const stamp = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}supplementary-${stamp}.json`;
      await FileSystem.writeAsStringAsync(uri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Export Supplementary data",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Saved", `Data written to:\n${uri}`);
      }
    } catch (error) {
      Alert.alert("Export failed", String(error));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    setBusy("import");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) {
        setBusy(null);
        return;
      }
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const outcome = importFromJson(content);
      if (outcome.ok) {
        Alert.alert(
          "Import complete",
          `${outcome.count} supplement${outcome.count === 1 ? "" : "s"} loaded.`
        );
      } else {
        Alert.alert("Import failed", outcome.error ?? "Unknown error.");
      }
    } catch (error) {
      Alert.alert("Import failed", String(error));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = () => {
    if (busy) return;
    if (supplements.length === 0) {
      runImport();
      return;
    }
    Alert.alert(
      "Replace all data?",
      "Importing will overwrite the supplements currently stored on this device. Consider exporting a backup first.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Import & Replace", style: "destructive", onPress: runImport },
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
            <PillIcon className="h-5 w-5 text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-medium">
              {supplements.length} supplement
              {supplements.length === 1 ? "" : "s"} tracked
            </Text>
            <Text variant="muted" className="text-xs">
              Tap to see your monthly cost
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
                Estimated monthly cost
              </Text>
              <Text variant="h2" className="mt-1 text-primary">
                {formatCurrency(monthlyTotal, currency)}
              </Text>
              <Text variant="muted" className="text-xs">
                ≈ {formatCurrency(monthlyTotal * 12, currency)} per year
              </Text>

              {costBreakdown.length > 0 ? (
                <View className="mt-4 gap-2">
                  {costBreakdown.map((entry) => (
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
                      <Text variant="small" className="text-muted-foreground">
                        {formatCurrency(entry.cost, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text variant="muted" className="mt-3 text-xs leading-5">
                  Add a price, container amount and schedule to a supplement to
                  see its monthly cost here.
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </SettingsCard>

      <SectionLabel className="mt-6">History</SectionLabel>
      <HistoryCalendar />

      <SectionLabel className="mt-6">Preferences</SectionLabel>
      <SettingsCard>
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-1 pr-3">
            <Text className="font-medium">Currency</Text>
            <Text variant="muted" className="text-xs">
              Used for prices and cost per dose
            </Text>
          </View>
          <Segmented
            options={CURRENCY_OPTIONS.map((o) => ({
              value: o.value,
              label: `${o.symbol} ${o.label}`,
            }))}
            value={currency}
            onChange={setCurrency}
          />
        </View>

        <Divider />

        <View className="flex-row items-center justify-between p-4">
          <View className="flex-1 pr-3">
            <Text className="font-medium">Show unscheduled supplements</Text>
            <Text variant="muted" className="text-xs leading-5">
              When off, the Supplements list only shows what&apos;s due today and
              hides everything not scheduled for today.
            </Text>
          </View>
          <Switch
            checked={showUnscheduled}
            onCheckedChange={setShowUnscheduled}
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
              {activeThemeName} · applies to Supplements only
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
              onSelect={(id) => setThemeId("supplements", id)}
            />
          </View>
        ) : null}
      </SettingsCard>

      <SectionLabel className="mt-6">Backup</SectionLabel>
      <SettingsCard>
        <ActionRow
          icon={<DownloadIcon className="h-5 w-5 text-primary" />}
          title="Export data"
          subtitle="Save all supplements to a JSON file"
          onPress={handleExport}
          loading={busy === "export"}
          disabled={busy !== null}
        />
        <Divider />
        <ActionRow
          icon={<UploadIcon className="h-5 w-5 text-primary" />}
          title="Import data"
          subtitle="Restore from a previously exported JSON file"
          onPress={handleImport}
          loading={busy === "import"}
          disabled={busy !== null}
        />
      </SettingsCard>
      <Text variant="muted" className="mt-2 px-1 text-xs leading-5">
        Importing replaces everything currently stored. Export a backup first if
        you want to keep your current data.
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
              Seed sample data and reset storage
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
              subtitle="Replace with 20 sample supplements"
              onPress={handleGenerateMock}
              disabled={busy !== null}
            />
            <Divider />
            <ActionRow
              icon={<Trash2Icon className="h-5 w-5 text-destructive" />}
              title="Clear all data"
              subtitle="Remove every stored supplement"
              onPress={handleClearAll}
              disabled={busy !== null}
            />
          </View>
        ) : null}
      </SettingsCard>
    </View>
  );
}
