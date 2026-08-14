import * as React from "react";
import { Pressable, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Text, cn } from "@/components/ui";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
} from "@/components/ui/lib/icons";
import { useWeightUnit } from "@/lib/preferences";
import { DAY_LABELS, dateKey } from "@/lib/supplements";
import {
  datesWithSets,
  fullDayLabel,
  formatDayForClipboard,
  formatReps,
  formatSetWeight,
  getMonths,
  groupByExercise,
  monthKey,
  monthLabel,
  setsOnDate,
  useWorkoutSelector,
} from "@/lib/workouts";

const WEEKDAY_INITIALS = DAY_LABELS.map((d) => d[0]);

export function WorkoutCalendar() {
  const unit = useWeightUnit();
  const today = React.useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [view, setView] = React.useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const months = useWorkoutSelector(() => getMonths());
  const viewKey = monthKey(new Date(view.year, view.month, 1));
  const dayKeys = useWorkoutSelector(() => datesWithSets(viewKey), [viewKey]);

  const earliestKey = months[0] ?? monthKey(today);
  const latestKey = monthKey(today);
  const canGoPrev = viewKey > earliestKey;
  const canGoNext = viewKey < latestKey;

  const shiftMonth = (delta: number) => {
    setSelectedKey(null);
    setCopied(false);
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const groups = useWorkoutSelector(
    () => (selectedKey ? groupByExercise(setsOnDate(selectedKey)) : []),
    [selectedKey]
  );

  const handleCopy = async () => {
    if (!selectedKey) return;
    await Clipboard.setStringAsync(formatDayForClipboard(selectedKey, unit));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (months.length === 0) {
    return (
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text variant="muted" className="text-xs leading-5">
          No history yet. Record a set on the Workout tab and it will show up
          here.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between px-1 pb-3">
        <NavButton disabled={!canGoPrev} onPress={() => shiftMonth(-1)}>
          <ChevronLeftIcon
            className={cn(
              "h-5 w-5",
              canGoPrev ? "text-foreground" : "text-muted-foreground/40"
            )}
          />
        </NavButton>
        <Text className="font-semibold">{monthLabel(viewKey)}</Text>
        <NavButton disabled={!canGoNext} onPress={() => shiftMonth(1)}>
          <ChevronRightIcon
            className={cn(
              "h-5 w-5",
              canGoNext ? "text-foreground" : "text-muted-foreground/40"
            )}
          />
        </NavButton>
      </View>

      <View className="flex-row">
        {WEEKDAY_INITIALS.map((label, i) => (
          <View
            key={`${label}-${i}`}
            className="items-center"
            style={{ width: `${100 / 7}%` }}
          >
            <Text variant="muted" className="text-[11px] font-medium">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-1 flex-row flex-wrap">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <View
                key={`blank-${i}`}
                style={{ width: `${100 / 7}%`, height: 44 }}
              />
            );
          }
          const key = dateKey(new Date(view.year, view.month, day));
          const hasEntries = dayKeys.has(key);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isFuture = key > todayKey;

          return (
            <View
              key={key}
              style={{ width: `${100 / 7}%`, height: 44 }}
              className="p-0.5"
            >
              <Pressable
                disabled={isFuture}
                onPress={() => {
                  setCopied(false);
                  setSelectedKey(isSelected ? null : key);
                }}
                className={cn(
                  "flex-1 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary" : isToday ? "bg-secondary" : "",
                  isFuture && "opacity-30"
                )}
              >
                <Text
                  className={cn(
                    "text-sm",
                    isSelected
                      ? "font-semibold text-primary-foreground"
                      : isToday
                        ? "font-semibold text-foreground"
                        : "text-foreground"
                  )}
                >
                  {day}
                </Text>
                <View
                  className={cn(
                    "mt-0.5 h-1 w-1 rounded-full",
                    hasEntries
                      ? isSelected
                        ? "bg-primary-foreground"
                        : "bg-primary"
                      : "bg-transparent"
                  )}
                />
              </Pressable>
            </View>
          );
        })}
      </View>

      {selectedKey ? (
        <View className="mt-2 border-t border-border pt-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="small" className="flex-1 pr-3 font-semibold">
              {fullDayLabel(selectedKey)}
            </Text>
            {groups.length > 0 ? (
              <Pressable
                onPress={handleCopy}
                className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5 active:bg-secondary"
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Text
                  variant="muted"
                  className={cn("text-xs", copied && "text-primary")}
                >
                  {copied ? "Copied" : "Copy"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {groups.length === 0 ? (
            <Text variant="muted" className="text-xs">
              Nothing recorded this day.
            </Text>
          ) : (
            <View className="gap-3">
              {groups.map((group) => (
                <View key={group.exerciseId}>
                  <Text variant="small" className="font-semibold text-primary">
                    {group.name}
                  </Text>
                  <View className="mt-1 gap-1">
                    {group.sets.map((set, i) => (
                      <View
                        key={set.id}
                        className="flex-row items-center justify-between"
                      >
                        <Text variant="muted" className="w-14 text-xs">
                          Set {i + 1}
                        </Text>
                        <Text className="flex-1 text-xs text-foreground">
                          {formatReps(set.reps)}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {formatSetWeight(set, unit)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text variant="muted" className="mt-2 px-1 text-xs">
          Tap a day to see what you trained.
        </Text>
      )}
    </View>
  );
}

function NavButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      className="h-9 w-9 items-center justify-center rounded-full active:bg-secondary"
    >
      {children}
    </Pressable>
  );
}
