import * as React from "react";
import { Pressable, View } from "react-native";
import { Text, cn } from "@/components/ui";
import { CheckIcon } from "@/components/ui/lib/icons";
import { formatCurrency, useCurrency } from "@/lib/preferences";
import {
  costPerDose,
  dateKey,
  dosesLeft,
  formatAmount,
  isScheduledOn,
  isTakenOn,
  projectSupply,
  type Supplement,
} from "@/lib/supplements";

interface SupplementCardProps {
  supplement: Supplement;
  /** The day this card is being viewed/edited for. */
  date: Date;
  onPress: () => void;
  onToggleTaken: () => void;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSupply(calendarDays: number | null): string {
  if (calendarDays === null) return "no schedule set";
  if (calendarDays <= 0) return "due to run out";
  if (calendarDays < 14) return `~${calendarDays} days of supply`;
  if (calendarDays < 60) return `~${Math.round(calendarDays / 7)} weeks of supply`;
  return `~${Math.round(calendarDays / 30)} months of supply`;
}

export function SupplementCard({
  supplement,
  date,
  onPress,
  onToggleTaken,
}: SupplementCardProps) {
  const scheduledToday = isScheduledOn(supplement, date);
  const takenToday = isTakenOn(supplement, date);
  const isToday = dateKey(date) === dateKey();
  const daySuffix = isToday ? " today" : "";
  const doses = dosesLeft(supplement);
  const projection = projectSupply(supplement);
  const cost = costPerDose(supplement);
  const currency = useCurrency();

  const pct =
    supplement.containerAmount > 0
      ? Math.max(
          0,
          Math.min(100, (supplement.amountLeft / supplement.containerAmount) * 100)
        )
      : 0;

  const low = doses <= 7 && doses > 0;
  const empty = doses <= 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-center">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2">
            <Text variant="h5" numberOfLines={1} className="flex-shrink">
              {supplement.name}
            </Text>
          </View>

          <View className="mt-1 flex-row items-center gap-1.5">
            {takenToday ? (
              <Text variant="small" className="text-primary">
                Taken{daySuffix} ·{" "}
                {formatAmount(supplement.servingSize, supplement.unit)}
              </Text>
            ) : scheduledToday ? (
              <Text variant="small" className="text-foreground">
                Take {formatAmount(supplement.servingSize, supplement.unit)}
                {daySuffix}
              </Text>
            ) : (
              <Text variant="small" className="text-muted-foreground">
                Not scheduled{daySuffix}
              </Text>
            )}
          </View>
        </View>

        <Pressable
          onPress={onToggleTaken}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: takenToday }}
          accessibilityLabel={
            takenToday ? `Undo ${supplement.name}` : `Mark ${supplement.name} taken`
          }
          className={cn(
            "h-11 w-11 items-center justify-center rounded-full border-2",
            takenToday
              ? "border-primary bg-primary"
              : "border-border bg-secondary active:bg-accent"
          )}
        >
          {takenToday ? (
            <CheckIcon className="h-6 w-6 text-primary-foreground" />
          ) : (
            <View className="h-4 w-4 rounded-full bg-muted-foreground/40" />
          )}
        </Pressable>
      </View>

      <View className="mt-4">
        <View className="h-2 overflow-hidden rounded-full bg-secondary">
          <View
            className={cn(
              "h-full rounded-full",
              empty ? "bg-destructive" : low ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text variant="muted" className="text-xs">
            {formatAmount(supplement.amountLeft, supplement.unit)}
            {supplement.containerAmount > 0
              ? ` of ${formatAmount(supplement.containerAmount, supplement.unit)}`
              : ""}{" "}
            left
          </Text>
          <Text
            variant="muted"
            className={cn(
              "text-xs",
              empty && "text-destructive",
              low && "text-amber-500"
            )}
          >
            {empty
              ? "Empty — time to refill"
              : `${doses} ${doses === 1 ? "dose" : "doses"} · ${formatSupply(
                  projection.calendarDays
                )}`}
          </Text>
        </View>

        {!empty && projection.runOutDate ? (
          <Text variant="muted" className="mt-1 text-xs">
            Runs out around {formatShortDate(projection.runOutDate)}
            {cost !== null ? ` · ${formatCurrency(cost, currency)} / dose` : ""}
          </Text>
        ) : cost !== null ? (
          <Text variant="muted" className="mt-1 text-xs">
            {formatCurrency(cost, currency)} / dose
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
