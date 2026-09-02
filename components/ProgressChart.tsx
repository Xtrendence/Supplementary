import * as React from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/ui";
import { useTheme } from "@/lib/preferences";
import { hsl } from "@/lib/themes";
import type { SeriesPoint } from "@/lib/analytics";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
  /** Each series is drawn against its own maximum, so a normalised overlay and
   *  a single absolute series share the same mapping. */
  max: number;
  format: (value: number) => string;
}

export const CHART_HEIGHT = 220;
export const Y_AXIS_WIDTH = 46;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;
const GRID_LINES = 4;

function plotHeight(height: number): number {
  return height - PAD_TOP - PAD_BOTTOM;
}

/** Fixed column beside the scrolling plot, so the scale stays readable while
 *  panning through a year. Only meaningful for a single series — an overlay of
 *  several is drawn normalised and labels percentages instead. */
export function ChartYAxis({
  max,
  format,
  height = CHART_HEIGHT,
}: {
  max: number;
  format: (value: number) => string;
  height?: number;
}) {
  const theme = useTheme();
  const inner = plotHeight(height);

  return (
    <Svg width={Y_AXIS_WIDTH} height={height}>
      {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
        const fraction = i / GRID_LINES;
        const y = PAD_TOP + inner * fraction;
        return (
          <SvgText
            key={i}
            x={Y_AXIS_WIDTH - 6}
            y={y + 4}
            fontSize={10}
            textAnchor="end"
            fill={hsl(theme.palette.mutedForeground)}
          >
            {format(max * (1 - fraction))}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function ProgressPlot({
  series,
  sessionDays,
  totalDays,
  monthLabels,
  width,
  height = CHART_HEIGHT,
  selected,
  onSelect,
}: {
  series: ChartSeries[];
  sessionDays: number[];
  totalDays: number;
  monthLabels: { x: number; label: string }[];
  width: number;
  height?: number;
  selected: number | null;
  onSelect: (dayIndex: number) => void;
}) {
  const theme = useTheme();
  const inner = plotHeight(height);
  const span = Math.max(1, totalDays - 1);

  const toX = (dayIndex: number) => (dayIndex / span) * width;
  const toY = (value: number, max: number) =>
    PAD_TOP + inner - (max > 0 ? Math.min(1, value / max) : 0) * inner;

  const single = series.length === 1;

  return (
    <Pressable
      onPress={(event) => {
        const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
        onSelect(Math.round(ratio * span));
      }}
    >
      <Svg width={width} height={height}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const y = PAD_TOP + (inner * i) / GRID_LINES;
          return (
            <Line
              key={`grid-${i}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={hsl(theme.palette.border)}
              strokeWidth={1}
            />
          );
        })}

        {/* One line per training day, spanning the plot. */}
        {sessionDays.map((day) => (
          <Line
            key={`session-${day}`}
            x1={toX(day)}
            y1={PAD_TOP}
            x2={toX(day)}
            y2={PAD_TOP + inner}
            stroke={hsl(theme.palette.primary)}
            strokeWidth={1}
            opacity={0.18}
          />
        ))}

        {monthLabels.map((tick) => (
          <SvgText
            key={`month-${tick.x}`}
            x={toX(tick.x)}
            y={height - 8}
            fontSize={10}
            textAnchor="middle"
            fill={hsl(theme.palette.mutedForeground)}
          >
            {tick.label}
          </SvgText>
        ))}

        {series.map((line) => {
          if (line.points.length === 0) return null;
          const path = line.points
            .map(
              (point, i) =>
                `${i === 0 ? "M" : "L"} ${toX(point.x)} ${toY(point.y, line.max)}`
            )
            .join(" ");

          return (
            <React.Fragment key={line.key}>
              {single ? (
                <Path
                  d={`${path} L ${toX(line.points[line.points.length - 1].x)} ${
                    PAD_TOP + inner
                  } L ${toX(line.points[0].x)} ${PAD_TOP + inner} Z`}
                  fill={line.color}
                  opacity={0.12}
                />
              ) : null}
              <Path
                d={path}
                stroke={line.color}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {line.points.length <= 90
                ? line.points.map((point) => (
                    <Circle
                      key={`${line.key}-${point.date}`}
                      cx={toX(point.x)}
                      cy={toY(point.y, line.max)}
                      r={2.5}
                      fill={line.color}
                    />
                  ))
                : null}
            </React.Fragment>
          );
        })}

        {selected !== null ? (
          <>
            <Line
              x1={toX(selected)}
              y1={PAD_TOP}
              x2={toX(selected)}
              y2={PAD_TOP + inner}
              stroke={hsl(theme.palette.foreground)}
              strokeWidth={1.5}
              opacity={0.7}
            />
            {series.map((line) => {
              const hit = line.points.find((p) => p.x === selected);
              if (!hit) return null;
              return (
                <Circle
                  key={`hit-${line.key}`}
                  cx={toX(hit.x)}
                  cy={toY(hit.y, line.max)}
                  r={5}
                  fill={line.color}
                  stroke={hsl(theme.palette.card)}
                  strokeWidth={2}
                />
              );
            })}
          </>
        ) : null}
      </Svg>
    </Pressable>
  );
}

export function ChartLegend({
  series,
  hidden,
  onToggle,
}: {
  series: ChartSeries[];
  hidden: Set<string>;
  onToggle?: (key: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
      {series.map((line) => {
        const off = hidden.has(line.key);
        return (
          <Pressable
            key={line.key}
            disabled={!onToggle}
            onPress={() => onToggle?.(line.key)}
            className="flex-row items-center gap-2"
            style={{ opacity: off ? 0.4 : 1 }}
          >
            <View
              style={{
                width: 12,
                height: 4,
                borderRadius: 2,
                backgroundColor: line.color,
              }}
            />
            <Text variant="muted" className="text-xs">
              {line.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
