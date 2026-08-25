import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import { Button, Input, Text } from "@/components/ui";
import { Trash2Icon } from "@/components/ui/lib/icons";
import { SlideUpSheet } from "@/components/SlideUpSheet";
import { SpeedSelector } from "@/components/SpeedSelector";
import {
  type SetPatch,
  type SetSpeed,
  type WeightUnit,
  type WorkoutSet,
  dayLabel,
  roundWeight,
  weightIn,
} from "@/lib/workouts";

export function SetEditorSheet({
  set,
  setNumber,
  unit,
  onClose,
  onSave,
  onDelete,
}: {
  set: WorkoutSet | null;
  setNumber: number;
  unit: WeightUnit;
  onClose: () => void;
  onSave: (patch: SetPatch) => void;
  onDelete: () => void;
}) {
  const [reps, setReps] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [note, setNote] = React.useState("");
  const [speed, setSpeed] = React.useState<SetSpeed | undefined>(undefined);

  // The weight is shown in the current display unit; if it's left untouched the
  // original value and unit are kept so nothing drifts through conversion.
  const originalWeight = set ? roundWeight(weightIn(set, unit)) : 0;

  React.useEffect(() => {
    if (!set) return;
    setReps(String(set.reps));
    setWeight(String(roundWeight(weightIn(set, unit))));
    setNote(set.note ?? "");
    setSpeed(set.speed);
  }, [set, unit]);

  const parsedReps = Number.parseInt(reps, 10);
  const parsedWeight = Number.parseFloat(weight);
  const canSave =
    Number.isFinite(parsedReps) &&
    parsedReps > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0;

  const handleSave = () => {
    if (!set || !canSave) return;
    const unchanged = roundWeight(parsedWeight) === originalWeight;
    onSave({
      reps: parsedReps,
      weight: unchanged ? set.weight : parsedWeight,
      unit: unchanged ? set.unit : unit,
      speed,
      note,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete this set?",
      "This permanently removes the set from your history.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <SlideUpSheet visible={set !== null} onClose={onClose}>
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row items-end justify-between">
          <View className="flex-1 pr-3">
            <Text variant="h5">Set {setNumber}</Text>
            <Text variant="muted" className="text-xs">
              {set ? dayLabel(set.date) : ""}
            </Text>
          </View>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            accessibilityLabel="Delete set"
            className="h-10 w-10 items-center justify-center rounded-full border border-border active:bg-secondary"
          >
            <Trash2Icon className="h-5 w-5 text-destructive" />
          </Pressable>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Text variant="small" className="mb-2 text-muted-foreground">
              Reps
            </Text>
            <Input
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="0"
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
              selectTextOnFocus
            />
          </View>
        </View>

        <View className="mt-4">
          <Text variant="small" className="mb-2 text-muted-foreground">
            Speed
          </Text>
          <SpeedSelector value={speed} onChange={setSpeed} />
        </View>

        <View className="mt-4">
          <Text variant="small" className="mb-2 text-muted-foreground">
            Note (optional)
          </Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="e.g. last rep was a grind"
            multiline
            className="native:h-auto h-auto min-h-12 py-2"
          />
        </View>

        <View className="mt-5 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={onClose}>
            <Text className="font-medium text-foreground">Cancel</Text>
          </Button>
          <Button className="flex-1" onPress={handleSave} disabled={!canSave}>
            <Text className="font-semibold text-primary-foreground">
              Save changes
            </Text>
          </Button>
        </View>
      </View>
    </SlideUpSheet>
  );
}
