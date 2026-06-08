import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView, ScrollView, Switch, Text, cn } from "@/components/ui";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  PillIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "@/components/ui/lib/icons";
import {
  CURRENCY_OPTIONS,
  formatCurrency,
  setAutoUpdate,
  setCurrency,
  setShowUnscheduled,
  setThemeId,
  useAutoUpdate,
  useCurrency,
  useShowUnscheduled,
  useThemeId,
} from "@/lib/preferences";
import { hsl, THEMES, type Theme } from "@/lib/themes";
import {
  checkForUpdate,
  currentVersion,
  downloadAndInstall,
  type UpdateInfo,
} from "@/lib/updates";
import { HistoryCalendar } from "@/components/HistoryCalendar";
import {
  buildExportPayload,
  clearAllSupplements,
  generateMockData,
  importFromJson,
  monthlyCost,
  totalMonthlyCost,
  useSupplements,
} from "@/lib/supplements";

export default function Settings() {
  const supplements = useSupplements();
  const currency = useCurrency();
  const activeThemeId = useThemeId();
  const showUnscheduled = useShowUnscheduled();
  const autoUpdate = useAutoUpdate();
  const [busy, setBusy] = React.useState<"export" | "import" | null>(null);
  const [debugOpen, setDebugOpen] = React.useState(false);
  const [dataOpen, setDataOpen] = React.useState(false);
  const [themesOpen, setThemesOpen] = React.useState(false);
  const [update, setUpdate] = React.useState<{
    status: "idle" | "checking" | "available" | "uptodate" | "downloading" | "error";
    info?: UpdateInfo;
    progress?: number;
    error?: string;
  }>({ status: "idle" });

  const handleCheckUpdate = async () => {
    setUpdate({ status: "checking" });
    try {
      const info = await checkForUpdate();
      setUpdate(info ? { status: "available", info } : { status: "uptodate" });
    } catch (error) {
      setUpdate({ status: "error", error: String(error) });
    }
  };

  const handleInstallUpdate = async (info: UpdateInfo) => {
    setUpdate({ status: "downloading", info, progress: 0 });
    try {
      await downloadAndInstall(info, (fraction) =>
        setUpdate((prev) => ({ ...prev, progress: fraction }))
      );
    } catch (error) {
      setUpdate({ status: "error", error: String(error) });
    }
  };

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

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0";

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <View className="px-4 pb-2 pt-2">
        <Text variant="h2">Settings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28 pt-2">
        <SectionLabel>About your data</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
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
              <View className="h-px bg-border" />
              <View className="p-4">
                <Text variant="muted" className="text-xs uppercase tracking-widest">
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
        </View>

        <SectionLabel className="mt-6">History</SectionLabel>
        <HistoryCalendar />

        <SectionLabel className="mt-6">Preferences</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pr-3">
              <Text className="font-medium">Currency</Text>
              <Text variant="muted" className="text-xs">
                Used for prices and cost per dose
              </Text>
            </View>
            <View className="flex-row rounded-full border border-border bg-secondary p-1">
              {CURRENCY_OPTIONS.map((option) => {
                const active = option.value === currency;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setCurrency(option.value)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5",
                      active && "bg-primary"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        active ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {option.symbol} {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="h-px bg-border" />

          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pr-3">
              <Text className="font-medium">Show unscheduled supplements</Text>
              <Text variant="muted" className="text-xs leading-5">
                When off, the Supplements list only shows what&apos;s due today
                and hides everything not scheduled for today.
              </Text>
            </View>
            <Switch
              checked={showUnscheduled}
              onCheckedChange={setShowUnscheduled}
            />
          </View>
        </View>

        <SectionLabel className="mt-6">Themes</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <Pressable
            onPress={() => setThemesOpen((open) => !open)}
            className="flex-row items-center gap-3 p-4 active:bg-secondary"
          >
            <View className="flex-1">
              <Text className="font-medium">Appearance</Text>
              <Text variant="muted" className="text-xs">
                {activeThemeName}
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
            <View className="px-3 pb-1">
              <View className="h-px bg-border" />
              <View className="mt-3 flex-row flex-wrap justify-between">
                {THEMES.map((theme) => (
                  <ThemeTile
                    key={theme.id}
                    theme={theme}
                    active={theme.id === activeThemeId}
                    onPress={() => setThemeId(theme.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <SectionLabel className="mt-6">Backup</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <ActionRow
            icon={<DownloadIcon className="h-5 w-5 text-primary" />}
            title="Export data"
            subtitle="Save all supplements to a JSON file"
            onPress={handleExport}
            loading={busy === "export"}
            disabled={busy !== null}
          />
          <View className="h-px bg-border" />
          <ActionRow
            icon={<UploadIcon className="h-5 w-5 text-primary" />}
            title="Import data"
            subtitle="Restore from a previously exported JSON file"
            onPress={handleImport}
            loading={busy === "import"}
            disabled={busy !== null}
          />
        </View>
        <Text variant="muted" className="mt-2 px-1 text-xs leading-5">
          Importing replaces everything currently stored. Export a backup first
          if you want to keep your current data.
        </Text>

        <SectionLabel className="mt-8">Debug</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
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
              <View className="h-px bg-border" />
              <ActionRow
                icon={<RefreshCwIcon className="h-5 w-5 text-primary" />}
                title="Generate mock data"
                subtitle="Replace with 20 sample supplements"
                onPress={handleGenerateMock}
                disabled={busy !== null}
              />
              <View className="h-px bg-border" />
              <ActionRow
                icon={<Trash2Icon className="h-5 w-5 text-destructive" />}
                title="Clear all data"
                subtitle="Remove every stored supplement"
                onPress={handleClearAll}
                disabled={busy !== null}
              />
            </View>
          ) : null}
        </View>

        <SectionLabel className="mt-8">Updates</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pr-3">
              <Text className="font-medium">Automatic updates</Text>
              <Text variant="muted" className="text-xs leading-5">
                Check GitHub releases on launch and offer to install new versions.
              </Text>
            </View>
            <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} />
          </View>

          <View className="h-px bg-border" />

          <ActionRow
            icon={<DownloadIcon className="h-5 w-5 text-primary" />}
            title="Check for updates"
            subtitle={`Installed v${currentVersion()}`}
            onPress={handleCheckUpdate}
            loading={update.status === "checking"}
            disabled={update.status === "checking" || update.status === "downloading"}
          />

          {update.status === "uptodate" ? (
            <Text variant="muted" className="px-4 pb-4 text-xs">
              You&apos;re on the latest version.
            </Text>
          ) : null}

          {update.status === "error" ? (
            <Text variant="muted" className="px-4 pb-4 text-xs text-destructive">
              {update.error}
            </Text>
          ) : null}

          {update.status === "available" && update.info ? (
            <View className="px-4 pb-4">
              <View className="h-px bg-border" />
              <Text variant="small" className="mt-3 font-semibold text-primary">
                v{update.info.version} available
              </Text>
              {update.info.notes ? (
                <Text variant="muted" className="mt-1 text-xs leading-5">
                  {update.info.notes.slice(0, 300)}
                </Text>
              ) : null}
              <Pressable
                onPress={() => update.info && handleInstallUpdate(update.info)}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 active:opacity-80"
              >
                <DownloadIcon className="h-5 w-5 text-primary-foreground" />
                <Text className="font-semibold text-primary-foreground">
                  Download & install
                </Text>
              </Pressable>
            </View>
          ) : null}

          {update.status === "downloading" ? (
            <View className="px-4 pb-4">
              <View className="h-px bg-border" />
              <Text variant="muted" className="mb-2 mt-3 text-xs">
                Downloading… {Math.round((update.progress ?? 0) * 100)}%
              </Text>
              <View className="h-2 overflow-hidden rounded-full bg-secondary">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((update.progress ?? 0) * 100)}%` }}
                />
              </View>
            </View>
          ) : null}
        </View>

        <SectionLabel className="mt-8">About</SectionLabel>
        <View className="rounded-2xl border border-border bg-card p-4">
          <Text className="font-medium">Supplementary</Text>
          <Text variant="muted" className="mt-1 text-xs">
            Version {version}
          </Text>
          <Text variant="muted" className="mt-3 text-xs leading-5">
            A calm, private supplement tracker. All data lives on your device —
            nothing leaves it unless you export it.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ThemeTile({
  theme,
  active,
  onPress,
}: {
  theme: Theme;
  active: boolean;
  onPress: () => void;
}) {
  const p = theme.palette;
  return (
    <Pressable onPress={onPress} style={{ width: "48%" }} className="mb-3">
      <View
        className="rounded-2xl border-2 p-2.5"
        style={{
          backgroundColor: hsl(p.background),
          borderColor: active ? hsl(p.primary) : hsl(p.border),
        }}
      >
        <View className="flex-row items-center justify-between">
          <View
            style={{
              backgroundColor: hsl(p.foreground),
              width: 44,
              height: 7,
              borderRadius: 4,
            }}
          />
          <View
            style={{
              backgroundColor: hsl(p.primary),
              width: 14,
              height: 14,
              borderRadius: 7,
            }}
          />
        </View>

        <View
          className="mt-2.5 rounded-lg p-2"
          style={{
            backgroundColor: hsl(p.card),
            borderWidth: 1,
            borderColor: hsl(p.border),
          }}
        >
          <View
            style={{
              backgroundColor: hsl(p.foreground),
              width: "70%",
              height: 6,
              borderRadius: 3,
            }}
          />
          <View
            className="mt-1.5"
            style={{
              backgroundColor: hsl(p.mutedForeground),
              width: "45%",
              height: 5,
              borderRadius: 3,
            }}
          />
          <View
            className="mt-2 overflow-hidden rounded-full"
            style={{ backgroundColor: hsl(p.secondary), height: 6 }}
          >
            <View
              style={{ backgroundColor: hsl(p.primary), width: "60%", height: 6 }}
            />
          </View>
        </View>

        <View className="mt-2 flex-row" style={{ gap: 4 }}>
          <View
            style={{
              backgroundColor: hsl(p.primary),
              width: 24,
              height: 10,
              borderRadius: 5,
            }}
          />
          <View
            style={{
              backgroundColor: hsl(p.accent),
              width: 16,
              height: 10,
              borderRadius: 5,
            }}
          />
          <View
            style={{
              backgroundColor: hsl(p.destructive),
              width: 10,
              height: 10,
              borderRadius: 5,
            }}
          />
        </View>
      </View>

      <View className="mt-1.5 flex-row items-center justify-between px-0.5">
        <Text variant="small" numberOfLines={1} className="flex-1 pr-1">
          {theme.name}
        </Text>
        {active ? <CheckIcon className="h-4 w-4 text-primary" /> : null}
      </View>
    </Pressable>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      variant="muted"
      className={cn("mb-2 px-1 text-xs uppercase tracking-widest", className)}
    >
      {children}
    </Text>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center gap-3 p-4 active:bg-secondary",
        disabled && !loading && "opacity-50"
      )}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-medium">{title}</Text>
        <Text variant="muted" className="text-xs">
          {subtitle}
        </Text>
      </View>
      {loading ? (
        <Text variant="muted" className="text-xs">
          Working…
        </Text>
      ) : null}
    </Pressable>
  );
}
