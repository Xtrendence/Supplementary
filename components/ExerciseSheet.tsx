import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import { Button, Input, Text } from "@/components/ui";
import { Trash2Icon } from "@/components/ui/lib/icons";
import { SlideUpSheet } from "@/components/SlideUpSheet";
import type { Exercise } from "@/lib/workouts";

export function ExerciseSheet({
  visible,
  exercise,
  setCount,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  /** Null when creating a new exercise. */
  exercise?: Exercise | null;
  setCount?: number;
  onClose: () => void;
  onSubmit: (name: string) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = React.useState("");

  React.useEffect(() => {
    if (visible) setName(exercise?.name ?? "");
  }, [visible, exercise]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      `Delete ${exercise?.name ?? "this exercise"}?`,
      setCount
        ? `This also removes all ${setCount} recorded set${setCount === 1 ? "" : "s"}.`
        : "This removes the exercise and any sets recorded against it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h5" className="flex-1 pr-3">
            {exercise ? "Edit exercise" : "New exercise"}
          </Text>
          {exercise && onDelete ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              accessibilityLabel="Delete exercise"
              className="h-10 w-10 items-center justify-center rounded-full border border-border active:bg-secondary"
            >
              <Trash2Icon className="h-5 w-5 text-destructive" />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-4">
          <Text variant="small" className="mb-2 text-muted-foreground">
            Name
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chest Press"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => canSave && onSubmit(trimmed)}
          />
        </View>

        <View className="mt-5 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={onClose}>
            <Text className="font-medium text-foreground">Cancel</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={!canSave}
            onPress={() => canSave && onSubmit(trimmed)}
          >
            <Text className="font-semibold text-primary-foreground">
              {exercise ? "Save" : "Add exercise"}
            </Text>
          </Button>
        </View>
      </View>
    </SlideUpSheet>
  );
}
