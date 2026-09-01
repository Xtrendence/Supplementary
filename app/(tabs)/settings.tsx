import * as React from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView, ScrollView, Switch, Text, cn } from "@/components/ui";
import { DownloadIcon, DumbbellIcon, PillIcon } from "@/components/ui/lib/icons";
import {
  ActionRow,
  Divider,
  SectionLabel,
  Segmented,
  SegmentedGroup,
  SettingsCard,
} from "@/components/settings/SettingsPrimitives";
import { SupplementSettings } from "@/components/settings/SupplementSettings";
import { WorkoutSettings } from "@/components/settings/WorkoutSettings";
import {
  type AppSection,
  SECTION_OPTIONS,
  setAutoUpdate,
  setActiveSection,
  setDefaultSection,
  useAutoUpdate,
  useDefaultSection,
} from "@/lib/preferences";
import {
  type UpdateInfo,
  checkForUpdate,
  currentVersion,
  downloadAndInstall,
} from "@/lib/updates";

export default function Settings() {
  // Settings opens neutral: pick a section to see the settings that belong to
  // it. Everything except this switcher, the default-section choice and
  // updates is scoped to one section.
  const [selected, setSelected] = React.useState<AppSection | null>(null);
  const defaultSection = useDefaultSection();
  const autoUpdate = useAutoUpdate();

  const [update, setUpdate] = React.useState<{
    status:
      | "idle"
      | "checking"
      | "available"
      | "uptodate"
      | "downloading"
      | "error";
    info?: UpdateInfo;
    progress?: number;
    error?: string;
  }>({ status: "idle" });

  // Coming back to a section's settings puts that section (and its theme) back
  // in charge.
  useFocusEffect(
    React.useCallback(() => {
      if (selected) setActiveSection(selected);
    }, [selected])
  );

  const handleSelect = (section: AppSection) => {
    const next = selected === section ? null : section;
    setSelected(next);
    if (next) setActiveSection(next);
  };

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

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <View className="px-4 pb-2 pt-2">
        <Text variant="h2">Settings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28 pt-2">
        <SegmentedGroup
          options={[
            {
              value: "supplements",
              label: "Supplements",
              icon: (active: boolean) => (
                <PillIcon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              ),
            },
            {
              value: "workout",
              label: "Workout",
              icon: (active: boolean) => (
                <DumbbellIcon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              ),
            },
          ]}
          value={selected}
          onChange={handleSelect}
        />

        {selected === null ? (
          <Text variant="muted" className="mb-6 mt-3 px-1 text-xs leading-5">
            Pick a section to see its settings. Data, history, themes and
            backups are kept separate for each one.
          </Text>
        ) : (
          <View className="mb-8 mt-6">
            {selected === "supplements" ? (
              <SupplementSettings />
            ) : (
              <WorkoutSettings />
            )}
          </View>
        )}

        <SectionLabel className={selected === null ? "" : "mt-2"}>
          General
        </SectionLabel>
        <SettingsCard>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pr-3">
              <Text className="font-medium">Open on</Text>
              <Text variant="muted" className="text-xs leading-5">
                The section the app starts on when you launch it.
              </Text>
            </View>
            <Segmented
              options={SECTION_OPTIONS}
              value={defaultSection}
              onChange={setDefaultSection}
            />
          </View>
        </SettingsCard>

        <SectionLabel className="mt-8">Updates</SectionLabel>
        <SettingsCard>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pr-3">
              <Text className="font-medium">Automatic updates</Text>
              <Text variant="muted" className="text-xs leading-5">
                Check GitHub releases on launch and offer to install new
                versions.
              </Text>
            </View>
            <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} />
          </View>

          <Divider />

          <ActionRow
            icon={<DownloadIcon className="h-5 w-5 text-primary" />}
            title="Check for updates"
            subtitle={`Installed v${currentVersion()}`}
            onPress={handleCheckUpdate}
            loading={update.status === "checking"}
            disabled={
              update.status === "checking" || update.status === "downloading"
            }
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
              <Divider />
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
                  Download &amp; install
                </Text>
              </Pressable>
            </View>
          ) : null}

          {update.status === "downloading" ? (
            <View className="px-4 pb-4">
              <Divider />
              <Text variant="muted" className="mb-2 mt-3 text-xs">
                Downloading… {Math.round((update.progress ?? 0) * 100)}%
              </Text>
              <View className="h-2 overflow-hidden rounded-full bg-secondary">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.round((update.progress ?? 0) * 100)}%`,
                  }}
                />
              </View>
            </View>
          ) : null}
        </SettingsCard>

        {/* The installed native version, the same value the update check
            compares against, so the two can't disagree. */}
        <Text variant="muted" className="mt-6 px-1 text-center text-xs">
          Supplementary v{currentVersion()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
