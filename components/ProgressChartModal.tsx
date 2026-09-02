import * as React from "react";
import { Dimensions, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, Text, cn } from "@/components/ui";
import { XIcon } from "@/components/ui/lib/icons";
import {
  type ChartSeries,
  ChartLegend,
  ChartYAxis,
  ProgressPlot,
  Y_AXIS_WIDTH,
} from "@/components/ProgressChart";
import { useTheme, useWeightUnit } from "@/lib/preferences";
import { CHART_COLORS, hsl, themeVars } from "@/lib/themes";
import { fullDayLabel } from "@/lib/workouts";
import {
  type MetricKey,
  buildMetricWindow,
  formatCompact,
  formatMetricValue,
  metricDescription,
  metricLabel,
  metricPoints,
  monthTicks,
  summarise,
} from "@/lib/analytics";

/** Enough room per day that a year's worth stays legible, and scrolls. */
const PX_PER_DAY = 5;
const MONTHS = 12;

export interface ProgressChartTarget {
  /** Which series to draw. More than one is overlaid and normalised. */
  metrics: MetricKey[];
  title: string;
  exerciseId?: string;
}

export function ProgressChartModal({
  target,
  onClose,
}: {
  target: ProgressChartTarget | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<number | null>(null);
  const scroller = React.useRef<ScrollView | null>(null);

  React.useEffect(() => {
    setHidden(new Set());
    setSelected(null);
  }, [target]);

  const window = React.useMemo(
    () =>
      target
        ? buildMetricWindow({
            months: MONTHS,
            exerciseId: target.exerciseId,
            unit,
          })
        : null,
    [target, unit]
  );

  const allSeries: ChartSeries[] = React.useMemo(() => {
    if (!window || !target) return [];
    return target.metrics
      .map((key) => {
        const points = metricPoints(window, key);
        return {
          key,
          label: metricLabel(key),
          color: CHART_COLORS[key],
          points,
          max: points.reduce((max, p) => Math.max(max, p.y), 0),
          format: (value: number) => formatMetricValue(key, value, unit),
        };
      })
      .filter((line) => line.points.length > 0);
  }, [window, target, unit]);

  const visible = allSeries.filter((line) => !hidden.has(line.key));
  const single = visible.length === 1;
  const summary = window ? summarise(window) : null;
  const screenWidth = Dimensions.get("window").width;
  // The scroller's viewport: screen minus the page padding and the fixed axis.
  const viewport = screenWidth - 32 - Y_AXIS_WIDTH;
  const plotWidth = window
    ? Math.max(viewport, window.days * PX_PER_DAY)
    : 0;
  // Start on the most recent data. Computed rather than left to a scrollToEnd
  // call, which races the modal's entry animation — on Android the layout pass
  // that follows resets the offset to zero.
  const initialOffset = Math.max(0, plotWidth + 8 - viewport);

  const selectedDay =
    window && selected !== null
      ? window.byDay.find((day) => day.dayIndex === selected)
      : undefined;

  return (
    <Modal
      visible={target !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={themeVars(theme)} className="flex-1 bg-background">
        <SafeAreaView edges={["top"]} className="flex-1">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-secondary"
            >
              <XIcon className="h-5 w-5 text-muted-foreground" />
            </Pressable>
            <Text variant="h5" numberOfLines={1} className="flex-1 px-2 text-center">
              {target?.title ?? ""}
            </Text>
            <View className="h-9 w-9" />
          </View>

          <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10">
            {!window || allSeries.length === 0 ? (
              <View className="mt-24 items-center px-8">
                <Text variant="h5" className="text-center">
                  Nothing to chart yet
                </Text>
                <Text variant="muted" className="mt-2 text-center leading-6">
                  Record a few sets — or pain levels — and the last {MONTHS}{" "}
                  months will show up here.
                </Text>
              </View>
            ) : (
              <>
                <Text variant="muted" className="text-xs leading-5">
                  {visible.length === 1
                    ? metricDescription(visible[0].key as MetricKey, window)
                    : "Each line is scaled to its own peak, so the shapes can be compared."}
                </Text>

                <View className="mt-1 h-6 justify-center">
                  {selectedDay ? (
                    <Text variant="small" className="font-semibold">
                      {fullDayLabel(selectedDay.date)}
                      {visible
                        .map((line) => {
                          const hit = line.points.find((p) => p.x === selected);
                          return hit ? ` · ${line.label} ${line.format(hit.y)}` : "";
                        })
                        .join("")}
                    </Text>
                  ) : (
                    <Text variant="muted" className="text-xs">
                      Tap the chart to read a day.
                    </Text>
                  )}
                </View>

                <View className="mt-2 flex-row">
                  {single ? (
                    <ChartYAxis
                      max={visible[0].max}
                      format={(value) =>
                        visible[0].key === "pain"
                          ? String(Math.round(value))
                          : formatCompact(value)
                      }
                    />
                  ) : (
                    <ChartYAxis
                      max={100}
                      format={(value) => `${Math.round(value)}%`}
                    />
                  )}
                  <ScrollView
                    ref={scroller}
                    horizontal
                    showsHorizontalScrollIndicator
                    contentContainerStyle={{ paddingRight: 8 }}
                    contentOffset={{ x: initialOffset, y: 0 }}
                    // Belt and braces: the offset above covers the first paint,
                    // this catches a late layout (rotation, keyboard) before
                    // the user has scrolled.
                    onLayout={() =>
                      scroller.current?.scrollTo({
                        x: initialOffset,
                        animated: false,
                      })
                    }
                  >
                    <ProgressPlot
                      series={visible}
                      sessionDays={window.sessionDays}
                      totalDays={window.days}
                      monthLabels={monthTicks(window)}
                      width={plotWidth}
                      selected={selected}
                      onSelect={setSelected}
                    />
                  </ScrollView>
                </View>

                <View className="mt-3">
                  <ChartLegend
                    series={allSeries}
                    hidden={hidden}
                    onToggle={
                      allSeries.length > 1
                        ? (key) =>
                            setHidden((prev) => {
                              const next = new Set(prev);
                              // Never hide the last visible line.
                              if (next.has(key)) next.delete(key);
                              else if (allSeries.length - next.size > 1) next.add(key);
                              return next;
                            })
                        : undefined
                    }
                  />
                  {allSeries.length > 1 ? (
                    <Text variant="muted" className="mt-2 text-xs">
                      Tap a line to hide it.
                    </Text>
                  ) : null}
                </View>

                <View className="mt-5 gap-2 rounded-2xl border border-border bg-card p-4">
                  <SummaryRow
                    label="Sessions"
                    value={String(summary?.sessions ?? 0)}
                  />
                  <SummaryRow
                    label="Total volume"
                    value={`${formatCompact(summary?.totalVolume ?? 0)} ${unit}`}
                  />
                  <SummaryRow
                    label="Heaviest set"
                    value={`${formatCompact(summary?.bestWeight ?? 0)} ${unit}`}
                  />
                  {!target?.exerciseId ? (
                    <SummaryRow
                      label="Pain records"
                      value={
                        summary && summary.painRecords > 0
                          ? `${summary.painRecords} days · worst ${summary.worstPain}`
                          : "none"
                      }
                    />
                  ) : null}
                </View>

                <View className="mt-3 flex-row items-center gap-2">
                  <View
                    style={{
                      width: 2,
                      height: 12,
                      backgroundColor: hsl(theme.palette.primary),
                      opacity: 0.5,
                    }}
                  />
                  <Text variant="muted" className="text-xs">
                    Each vertical line is a day you trained.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className={cn("flex-row items-center justify-between")}>
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
      <Text variant="small" className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
