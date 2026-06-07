import * as React from "react";
import { Pressable, View } from "react-native";
import { Text, cn } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/lib/icons";
import {
  DAY_LABELS,
  dateFromKey,
  dateKey,
  earliestTakenKey,
  formatAmount,
  takenDateKeys,
  takenOnDate,
  useSupplements,
} from "@/lib/supplements";

const WEEKDAY_INITIALS = DAY_LABELS.map((d) => d[0]);

function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryCalendar() {
  const supplements = useSupplements();
  const today = React.useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [view, setView] = React.useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const takenKeys = React.useMemo(() => takenDateKeys(supplements), [supplements]);
  const earliest = React.useMemo(() => earliestTakenKey(supplements), [supplements]);

  const minMonth = React.useMemo(() => {
    const d = earliest ? dateFromKey(earliest) : today;
    return monthIndex(d.getFullYear(), d.getMonth());
  }, [earliest, today]);
  const maxMonth = monthIndex(today.getFullYear(), today.getMonth());
  const currentMonth = monthIndex(view.year, view.month);

  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;

  const shiftMonth = (delta: number) => {
    setSelectedKey(null);
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

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  const selectedRecords = selectedKey ? takenOnDate(supplements, selectedKey) : [];

  if (takenKeys.size === 0) {
    return (
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text variant="muted" className="text-xs leading-5">
          No history yet. Check a supplement off on the Supplements tab and it
          will show up here.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between px-1 pb-3">
        <NavButton disabled={!canGoPrev} onPress={() => shiftMonth(-1)}>
          <ChevronLeftIcon
            className={cn("h-5 w-5", canGoPrev ? "text-foreground" : "text-muted-foreground/40")}
          />
        </NavButton>
        <Text className="font-semibold">{monthLabel}</Text>
        <NavButton disabled={!canGoNext} onPress={() => shiftMonth(1)}>
          <ChevronRightIcon
            className={cn("h-5 w-5", canGoNext ? "text-foreground" : "text-muted-foreground/40")}
          />
        </NavButton>
      </View>

      <View className="flex-row">
        {WEEKDAY_INITIALS.map((label, i) => (
          <View key={`${label}-${i}`} className="items-center" style={{ width: `${100 / 7}%` }}>
            <Text variant="muted" className="text-[11px] font-medium">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-1 flex-row flex-wrap">
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          }
          const key = dateKey(new Date(view.year, view.month, day));
          const hasEntries = takenKeys.has(key);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isFuture = key > todayKey;

          return (
            <View key={key} style={{ width: `${100 / 7}%`, height: 44 }} className="p-0.5">
              <Pressable
                disabled={isFuture}
                onPress={() => setSelectedKey(isSelected ? null : key)}
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
          <Text variant="small" className="mb-2 font-semibold">
            {dateFromKey(selectedKey).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          {selectedRecords.length === 0 ? (
            <Text variant="muted" className="text-xs">
              Nothing taken this day.
            </Text>
          ) : (
            <View className="gap-2">
              {selectedRecords.map((record, i) => (
                <View
                  key={`${record.supplement.id}-${i}`}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-3">
                    <Text variant="small" numberOfLines={1} className="text-foreground">
                      {record.supplement.name}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {formatAmount(record.amount, record.unit)}
                    </Text>
                  </View>
                  <Text variant="muted" className="text-xs">
                    {formatTime(record.at)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text variant="muted" className="mt-2 px-1 text-xs">
          Tap a day to see what you took.
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
