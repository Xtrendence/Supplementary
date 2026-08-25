import * as React from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/lib/preferences";
import { hsl } from "@/lib/themes";
import { SPEED_LABELS, type SetSpeed } from "@/lib/workouts";

const LEVELS: SetSpeed[] = [1, 2, 3];

/** Three bars, filled up to the level tapped. Tapping the current level clears
 *  it again, since an unset speed means an ordinary pace rather than a missing
 *  value. */
export function SpeedSelector({
  value,
  onChange,
}: {
  value: SetSpeed | undefined;
  onChange: (value: SetSpeed | undefined) => void;
}) {
  const theme = useTheme();

  return (
    <View className="native:h-12 h-10 flex-row items-stretch" style={{ gap: 4 }}>
      {LEVELS.map((level) => {
        const filled = value !== undefined && level <= value;
        return (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityLabel={SPEED_LABELS[level]}
            accessibilityState={{ selected: filled }}
            onPress={() => onChange(value === level ? undefined : level)}
            style={{
              width: 16,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: filled
                ? hsl(theme.palette.primary)
                : hsl(theme.palette.input),
              backgroundColor: filled
                ? hsl(theme.palette.primary)
                : hsl(theme.palette.background),
            }}
          />
        );
      })}
    </View>
  );
}

/** Compact read-only version for set cards. */
export function SpeedBars({
  speed,
  color,
}: {
  speed: SetSpeed;
  color: string;
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 2 }}>
      {LEVELS.map((level) => (
        <View
          key={level}
          style={{
            width: 4,
            height: 16,
            borderRadius: 2,
            backgroundColor: color,
            opacity: level <= speed ? 1 : 0.2,
          }}
        />
      ))}
    </View>
  );
}
