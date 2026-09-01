import * as React from "react";
import { Alert, Keyboard, Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { Input, SafeAreaView, ScrollView, Text, cn } from "@/components/ui";
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  TimerIcon,
} from "@/components/ui/lib/icons";
import { ExerciseSheet } from "@/components/ExerciseSheet";
import { SetEditorSheet } from "@/components/SetEditorSheet";
import { SpeedBars, SpeedSelector } from "@/components/SpeedSelector";
import { useSecondTick } from "@/hooks/useSecondTick";
import { useTheme, useWeightUnit } from "@/lib/preferences";
import { SET_MARKER_COLORS, hsl, hslShifted } from "@/lib/themes";
import { dateKey } from "@/lib/supplements";
import {
  type SetPatch,
  type SetSpeed,
  type WorkoutSet,
  addSet,
  dayLabel,
  deleteExercise,
  deleteSet,
  findExerciseByName,
  formatElapsed,
  getExercise,
  groupByDate,
  highlightSets,
  lastSetFor,
  monthKeyOfDate,
  recentMonthKeys,
  renameExercise,
  roundWeight,
  setsInMonths,
  updateSet,
  useWorkoutSelector,
  weightIn,
} from "@/lib/workouts";

const MONTHS_SHOWN = 2;

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWeightUnit();
  const theme = useTheme();

  // Keeps the "last trained" counter below the inputs ticking.
  useSecondTick(useIsFocused());

  const exercise = useWorkoutSelector(() => (id ? getExercise(id) : null), [id]);
  const last = useWorkoutSelector(() => (id ? lastSetFor(id) : null), [id]);

  // Only the current and previous month are listed — anything older lives in
  // the calendar under Settings.
  const sets = useWorkoutSelector(
    () => (id ? setsInMonths(recentMonthKeys(MONTHS_SHOWN), id) : []),
    [id]
  );
  const groups = React.useMemo(() => groupByDate(sets), [sets]);
  const highlights = React.useMemo(() => highlightSets(sets), [sets]);

  const [reps, setReps] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [speed, setSpeed] = React.useState<SetSpeed | undefined>(undefined);
  const [editingSet, setEditingSet] = React.useState<{
    set: WorkoutSet;
    number: number;
  } | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  // The weight field always starts from whatever was last lifted for this
  // exercise, converted into the unit currently being displayed.
  React.useEffect(() => {
    if (last) setWeight(String(roundWeight(weightIn(last, unit))));
  }, [last, unit]);

  const parsedReps = Number.parseInt(reps, 10);
  const parsedWeight = Number.parseFloat(weight);
  const canAdd =
    Number.isFinite(parsedReps) &&
    parsedReps > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0;

  const handleAdd = () => {
    if (!id || !canAdd) return;
    addSet({
      exerciseId: id,
      reps: parsedReps,
      weight: parsedWeight,
      unit,
      speed,
    });
    // Reps and speed are entered fresh for every set; the weight refills itself
    // from the set that was just recorded.
    setReps("");
    setSpeed(undefined);
    Keyboard.dismiss();
  };

  const todayKey = dateKey();
  const repsColor = hsl(theme.palette.primary);
  const weightColor = hslShifted(theme.palette.primary, 165);

  if (!exercise) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <Header title="Exercise" onEdit={null} />
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="h5" className="text-center">
            This exercise no longer exists
          </Text>
          <Text variant="muted" className="mt-2 text-center leading-6">
            It may have been deleted from another screen.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-full bg-primary px-5 py-3 active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1">
      <Header title={exercise.name} onEdit={() => setEditOpen(true)} />

      <View className="border-b border-border px-4 pb-4">
        <View className="flex-row items-end gap-3">
          <View className="flex-1">
            <Text variant="small" className="mb-2 text-muted-foreground">
              Reps
            </Text>
            <Input
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="0"
              returnKeyType="next"
              selectTextOnFocus
            />
          </View>
          <View className="flex-1">
            <Text variant="small" className="mb-2 text-muted-foreground">
              Weight ({unit})
            </Text>
            <Input
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              selectTextOnFocus
            />
          </View>
          <View>
            <Text variant="small" className="mb-2 text-muted-foreground">
              Speed
            </Text>
            <SpeedSelector value={speed} onChange={setSpeed} />
          </View>

          <Pressable
            onPress={handleAdd}
            disabled={!canAdd}
            accessibilityLabel="Add set"
            className={cn(
              "native:h-12 h-10 w-12 items-center justify-center rounded-md bg-primary active:opacity-80",
              !canAdd && "opacity-40"
            )}
          >
            <PlusIcon className="h-6 w-6 text-primary-foreground" />
          </Pressable>
        </View>

        {last ? (
          <View className="mt-3 flex-row items-center gap-1.5">
            <TimerIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <Text variant="muted" className="text-xs">
              Last trained {formatElapsed(Date.now() - last.at)} ago
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {groups.length === 0 ? (
          <View className="mt-20 items-center px-6">
            <Text variant="h5" className="text-center">
              No sets yet
            </Text>
            <Text variant="muted" className="mt-2 text-center leading-6">
              Enter your reps and weight above, then tap the plus button to log
              your first set.
            </Text>
          </View>
        ) : (
          <>
            <Legend />
            {groups.map((group) => (
              <View key={group.date} className="mb-5">
                <View className="mb-2 flex-row items-baseline justify-between px-1">
                  <Text variant="small" className="font-semibold">
                    {dayLabel(group.date, todayKey)}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {group.sets.length} set{group.sets.length === 1 ? "" : "s"}
                  </Text>
                </View>

                {group.sets.map((set, index) => (
                  <SetCard
                    key={set.id}
                    set={set}
                    number={index + 1}
                    unit={unit}
                    repsColor={repsColor}
                    weightColor={weightColor}
                    borderColor={
                      set.id === highlights.pbId
                        ? SET_MARKER_COLORS.pb
                        : set.id === highlights.bothId
                          ? SET_MARKER_COLORS.both
                          : set.id === highlights.heaviestId
                            ? SET_MARKER_COLORS.weight
                            : set.id === highlights.mostRepsId
                              ? SET_MARKER_COLORS.reps
                              : hsl(theme.palette.border)
                    }
                    onPress={() => setEditingSet({ set, number: index + 1 })}
                  />
                ))}
              </View>
            ))}

            <Text variant="muted" className="mt-1 px-1 text-center text-xs leading-5">
              Showing the last {MONTHS_SHOWN} months. Use the calendar in
              Settings → Workout to browse older sessions.
            </Text>
          </>
        )}
      </ScrollView>

      <SetEditorSheet
        set={editingSet?.set ?? null}
        setNumber={editingSet?.number ?? 1}
        unit={unit}
        onClose={() => setEditingSet(null)}
        onSave={(patch: SetPatch) => {
          if (!editingSet) return;
          updateSet(
            editingSet.set.id,
            monthKeyOfDate(editingSet.set.date),
            patch
          );
          setEditingSet(null);
        }}
        onDelete={() => {
          if (!editingSet) return;
          deleteSet(editingSet.set.id, monthKeyOfDate(editingSet.set.date));
          setEditingSet(null);
        }}
      />

      <ExerciseSheet
        visible={editOpen}
        exercise={exercise}
        setCount={sets.length}
        onClose={() => setEditOpen(false)}
        onSubmit={(name) => {
          const clash = findExerciseByName(name, exercise.id);
          if (clash) {
            Alert.alert(
              "Name already used",
              `You already have an exercise called ${clash.name}.`
            );
            return;
          }
          renameExercise(exercise.id, name);
          setEditOpen(false);
        }}
        onDelete={() => {
          setEditOpen(false);
          deleteExercise(exercise.id);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

function Header({
  title,
  onEdit,
}: {
  title: string;
  onEdit: (() => void) | null;
}) {
  return (
    <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityLabel="Back"
        className="h-10 w-10 items-center justify-center rounded-full border border-border active:bg-secondary"
      >
        <ArrowLeftIcon className="h-5 w-5 text-foreground" />
      </Pressable>
      <Text variant="h4" numberOfLines={1} className="flex-1">
        {title}
      </Text>
      {onEdit ? (
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityLabel="Edit exercise"
          className="h-10 w-10 items-center justify-center rounded-full border border-border active:bg-secondary"
        >
          <PencilIcon className="h-5 w-5 text-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Legend() {
  return (
    <View className="mb-4 flex-row flex-wrap items-center gap-x-4 gap-y-1 px-1">
      <LegendDot color={SET_MARKER_COLORS.pb} label="PB" />
      <LegendDot color={SET_MARKER_COLORS.both} label="Both" />
      <LegendDot color={SET_MARKER_COLORS.weight} label="Heaviest" />
      <LegendDot color={SET_MARKER_COLORS.reps} label="Most reps" />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{ backgroundColor: color, width: 8, height: 8, borderRadius: 4 }}
      />
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
    </View>
  );
}

function SetCard({
  set,
  number,
  unit,
  repsColor,
  weightColor,
  borderColor,
  onPress,
}: {
  set: WorkoutSet;
  number: number;
  unit: ReturnType<typeof useWeightUnit>;
  repsColor: string;
  weightColor: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ borderColor, borderWidth: 1.5 }}
      className="mb-2 w-full rounded-2xl bg-card px-4 py-3 active:opacity-80"
    >
      <View className="flex-row items-center">
        <Text variant="muted" className="w-14 text-xs">
          Set {number}
        </Text>

        <View className="flex-1 flex-row items-baseline">
          <Text className="text-lg font-semibold" style={{ color: repsColor }}>
            {set.reps}
          </Text>
          <Text variant="muted" className="ml-1 text-xs">
            reps
          </Text>
        </View>

        {set.speed ? (
          <View className="mr-3">
            <SpeedBars speed={set.speed} color={weightColor} />
          </View>
        ) : null}

        <View className="flex-row items-baseline">
          <Text className="text-lg font-semibold" style={{ color: weightColor }}>
            {roundWeight(weightIn(set, unit))}
          </Text>
          <Text variant="muted" className="ml-1 text-xs">
            {unit}
          </Text>
        </View>
      </View>

      {set.note ? (
        <Text variant="muted" className="mt-1.5 text-xs leading-5">
          {set.note}
        </Text>
      ) : null}
    </Pressable>
  );
}
