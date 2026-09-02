import * as React from "react";
import { Alert, Pressable, View } from "react-native";
import { Button, Input, Text } from "@/components/ui";
import { Trash2Icon } from "@/components/ui/lib/icons";
import { PainSlider } from "@/components/PainSlider";
import { SlideUpSheet } from "@/components/SlideUpSheet";
import { useTheme } from "@/lib/preferences";
import { painColor } from "@/lib/themes";
import {
  PAIN_MAX,
  type PainEntry,
  formatPainTime,
  fullDayLabel,
} from "@/lib/workouts";

export function PainEditorSheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: PainEntry | null;
  onClose: () => void;
  onSave: (level: number, note: string) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const [level, setLevel] = React.useState(0);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!entry) return;
    setLevel(entry.level);
    setNote(entry.note ?? "");
  }, [entry]);

  const handleDelete = () => {
    Alert.alert(
      "Delete this record?",
      "This permanently removes the pain record from your history.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <SlideUpSheet visible={entry !== null} onClose={onClose}>
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row items-end justify-between">
          <View className="flex-1 pr-3">
            <Text variant="h5">Pain / irritation</Text>
            <Text variant="muted" className="text-xs">
              {entry ? `${fullDayLabel(entry.date)} · ${formatPainTime(entry)}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            accessibilityLabel="Delete record"
            className="h-10 w-10 items-center justify-center rounded-full border border-border active:bg-secondary"
          >
            <Trash2Icon className="h-5 w-5 text-destructive" />
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-baseline">
          <Text
            className="text-4xl font-semibold"
            style={{ color: painColor(level, theme) }}
          >
            {level}
          </Text>
          <Text variant="muted" className="ml-1 text-sm">
            / {PAIN_MAX}
          </Text>
        </View>

        <View className="mt-1">
          <PainSlider value={level} onChange={setLevel} />
        </View>

        <View className="mt-4">
          <Text variant="small" className="mb-2 text-muted-foreground">
            Note (optional)
          </Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="e.g. left knee, dull ache"
            multiline
            className="native:h-auto h-auto min-h-12 py-2"
          />
        </View>

        <View className="mt-5 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={onClose}>
            <Text className="font-medium text-foreground">Cancel</Text>
          </Button>
          <Button className="flex-1" onPress={() => onSave(level, note)}>
            <Text className="font-semibold text-primary-foreground">
              Save changes
            </Text>
          </Button>
        </View>
      </View>
    </SlideUpSheet>
  );
}
