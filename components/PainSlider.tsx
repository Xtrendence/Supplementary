import * as React from "react";
import { PanResponder, View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/lib/preferences";
import { hsl, painColor } from "@/lib/themes";
import { PAIN_MAX } from "@/lib/workouts";

const THUMB = 24;
const TRACK = 10;
const ROW = 44;

/** A plain 0–10 slider. Tapping anywhere on the row jumps to that value and
 *  dragging follows the finger.
 *
 *  Laid out with a negative margin rather than absolute positioning, because
 *  absolutely-positioned children don't render inside this app's bottom sheets
 *  on Android — see SlideUpSheet. The fill and thumb are `pointerEvents="none"`
 *  so touches always resolve against the row, keeping `locationX` measured from
 *  the same origin on both platforms. */
export function PainSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const widthRef = React.useRef(0);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => report(event.nativeEvent.locationX),
        onPanResponderMove: (event) => report(event.nativeEvent.locationX),
      }),
    []
  );

  // Kept outside the responder so it always reads the current width and callback.
  function report(x: number) {
    const width = widthRef.current;
    if (width <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / width));
    onChangeRef.current(Math.round(ratio * PAIN_MAX));
  }

  const [width, setWidth] = React.useState(0);
  const color = painColor(value, theme);
  const fraction = value / PAIN_MAX;
  const thumbOffset = Math.max(0, (width - THUMB) * fraction);

  return (
    <View>
      <View
        {...responder.panHandlers}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
          setWidth(event.nativeEvent.layout.width);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Pain level"
        accessibilityValue={{ min: 0, max: PAIN_MAX, now: value }}
        style={{ height: ROW, justifyContent: "center" }}
      >
        <View
          pointerEvents="none"
          style={{
            height: TRACK,
            borderRadius: TRACK / 2,
            backgroundColor: hsl(theme.palette.secondary),
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${fraction * 100}%`,
              height: TRACK,
              backgroundColor: color,
            }}
          />
        </View>

        <View
          pointerEvents="none"
          style={{ flexDirection: "row", marginTop: -(THUMB + TRACK) / 2 }}
        >
          <View style={{ width: thumbOffset }} />
          <View
            style={{
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: color,
              borderWidth: 3,
              borderColor: hsl(theme.palette.card),
            }}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="muted" className="text-xs">
          0 · none
        </Text>
        <Text variant="muted" className="text-xs">
          {PAIN_MAX} · worst
        </Text>
      </View>
    </View>
  );
}
