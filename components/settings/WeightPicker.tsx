import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text, cn } from "@/components/ui";
import {
  MAX_AVAILABLE_WEIGHT,
  clearAvailableWeights,
  toggleAvailableWeight,
  useAvailableWeights,
} from "@/lib/preferences";
import type { WeightUnit } from "@/lib/workouts";

const VALUES = Array.from({ length: MAX_AVAILABLE_WEIGHT }, (_, i) => i + 1);

/** The weights you can actually load, in the unit you think in. Kept per unit
 *  rather than converted, so a set of 5/10/15 lb dumbbells doesn't turn into
 *  2.3/4.5/6.8 kg options. */
export function WeightPicker({ unit }: { unit: WeightUnit }) {
  const selected = useAvailableWeights(unit);

  return (
    <View className="pb-4 pt-1">
      <View className="flex-row items-baseline justify-between px-4">
        <Text variant="muted" className="flex-1 pr-3 text-xs leading-5">
          {selected.length === 0
            ? `Nothing selected — goals will step by the smallest jump your history shows.`
            : `${selected.join(", ")} ${unit}`}
        </Text>
        {selected.length > 0 ? (
          <Pressable
            onPress={() => clearAvailableWeights(unit)}
            hitSlop={8}
            className="rounded-full border border-border px-3 py-1 active:bg-secondary"
          >
            <Text variant="muted" className="text-xs">
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {VALUES.map((value) => {
          const on = selected.includes(value);
          return (
            <Pressable
              key={value}
              onPress={() => toggleAvailableWeight(unit, value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${value} ${unit}`}
              className={cn(
                "h-14 w-14 items-center justify-center rounded-xl border",
                on ? "border-primary bg-primary" : "border-border bg-secondary"
              )}
            >
              <Text
                className={cn(
                  "text-base font-semibold",
                  on ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {value}
              </Text>
              <Text
                className={cn(
                  "text-[10px]",
                  on ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {unit}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
