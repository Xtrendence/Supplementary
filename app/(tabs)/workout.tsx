import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView, ScrollView, Text, cn } from "@/components/ui";
import {
  ChevronRightIcon,
  DumbbellIcon,
  PlusIcon,
  TimerIcon,
} from "@/components/ui/lib/icons";
import { ExerciseSheet } from "@/components/ExerciseSheet";
import { setActiveSection, useWeightUnit } from "@/lib/preferences";
import {
  type Exercise,
  addExercise,
  deleteExercise,
  findExerciseByName,
  formatElapsed,
  formatReps,
  formatSetWeight,
  getExercises,
  lastSetFor,
  renameExercise,
  useWorkoutSelector,
  type WorkoutSet,
} from "@/lib/workouts";

/** Re-renders once a second so the "time since" counters stay live. */
function useSecondTick(enabled: boolean): void {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (!enabled) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled]);
}

export default function Workout() {
  const unit = useWeightUnit();
  const focused = useIsFocused();
  useSecondTick(focused);

  // Each section owns its own theme, so viewing this tab makes it the active
  // one.
  useFocusEffect(React.useCallback(() => setActiveSection("workout"), []));

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Exercise | null>(null);

  const rows = useWorkoutSelector(() =>
    [...getExercises()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((exercise) => ({ exercise, last: lastSetFor(exercise.id) }))
  );

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (exercise: Exercise) => {
    setEditing(exercise);
    setSheetOpen(true);
  };

  const handleSubmit = (name: string) => {
    const clash = findExerciseByName(name, editing?.id);
    if (clash) {
      Alert.alert(
        "Name already used",
        `You already have an exercise called ${clash.name}.`
      );
      return;
    }
    if (editing) renameExercise(editing.id, name);
    else addExercise(name);
    setSheetOpen(false);
  };

  const handleDelete = () => {
    if (editing) deleteExercise(editing.id);
    setSheetOpen(false);
  };

  const trainedToday = rows.filter(
    (row) => row.last && Date.now() - row.last.at < 24 * 60 * 60 * 1000
  ).length;

  const subtitle =
    rows.length === 0
      ? null
      : trainedToday > 0
        ? `${rows.length} exercise${rows.length === 1 ? "" : "s"} · ${trainedToday} trained in the last 24h`
        : `${rows.length} exercise${rows.length === 1 ? "" : "s"} tracked`;

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <View className="flex-row items-end justify-between px-4 pb-3 pt-2">
        <View className="flex-1 pr-3">
          <Text variant="muted" className="text-xs uppercase tracking-widest">
            Training
          </Text>
          <Text variant="h2" className="mt-0.5">
            Workout
          </Text>
          {subtitle ? (
            <Text variant="muted" className="mt-0.5 text-sm">
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={openCreate}
          accessibilityLabel="Add exercise"
          className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <PlusIcon className="h-6 w-6 text-primary-foreground" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28 pt-1">
        {rows.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          rows.map(({ exercise, last }) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              last={last}
              unit={unit}
              onPress={() =>
                router.push({
                  pathname: "/exercise/[id]",
                  params: { id: exercise.id },
                })
              }
              onLongPress={() => openEdit(exercise)}
            />
          ))
        )}
      </ScrollView>

      <ExerciseSheet
        visible={sheetOpen}
        exercise={editing}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />
    </SafeAreaView>
  );
}

function ExerciseRow({
  exercise,
  last,
  unit,
  onPress,
  onLongPress,
}: {
  exercise: Exercise;
  last: WorkoutSet | null;
  unit: ReturnType<typeof useWeightUnit>;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="mb-3 flex-row items-center rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      <View className="flex-1 pr-3">
        <Text variant="h5" numberOfLines={1}>
          {exercise.name}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-1.5">
          <TimerIcon
            className={cn(
              "h-3.5 w-3.5",
              last ? "text-primary" : "text-muted-foreground"
            )}
          />
          {last ? (
            <Text variant="small" className="text-primary">
              {formatElapsed(Date.now() - last.at)}
            </Text>
          ) : (
            <Text variant="small" className="text-muted-foreground">
              Never done
            </Text>
          )}
        </View>

        {last ? (
          <Text variant="muted" className="mt-1 text-xs">
            Last set · {formatReps(last.reps)} · {formatSetWeight(last, unit)}
          </Text>
        ) : (
          <Text variant="muted" className="mt-1 text-xs">
            Tap to record your first set
          </Text>
        )}
      </View>

      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="mt-24 items-center px-8">
      <View className="h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
        <DumbbellIcon className="h-10 w-10 text-primary" />
      </View>
      <Text variant="h4" className="mt-5 text-center">
        Start your log
      </Text>
      <Text variant="muted" className="mt-2 text-center leading-6">
        Add the exercises you train and Supplementary will track every set, plus
        how long it&apos;s been since you last did each one.
      </Text>
      <Pressable
        onPress={onAdd}
        className="mt-6 flex-row items-center gap-2 rounded-full bg-primary px-5 py-3 active:opacity-80"
      >
        <PlusIcon className="h-5 w-5 text-primary-foreground" />
        <Text className="font-semibold text-primary-foreground">
          Add your first exercise
        </Text>
      </Pressable>
    </View>
  );
}
