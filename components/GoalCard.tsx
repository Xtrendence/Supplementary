import { View } from "react-native";
import { Text } from "@/components/ui";
import { TargetIcon } from "@/components/ui/lib/icons";
import { GOAL_COLOR } from "@/lib/themes";
import { type Goal, goalLabel } from "@/lib/goals";
import { roundWeight } from "@/lib/workouts";

/** Read-only by design: a suggestion to aim at, not a control. */
export function GoalCard({ goal }: { goal: Goal }) {
  return (
    <View
      accessibilityLabel={`Suggested next set: ${roundWeight(goal.weight)} ${goal.unit} for ${goal.reps} reps. ${goal.reason}`}
      style={{ borderColor: GOAL_COLOR, borderWidth: 1.5 }}
      className="mb-4 w-full rounded-2xl bg-card px-4 py-3"
    >
      <View className="flex-row items-center gap-1.5">
        <TargetIcon className="h-3.5 w-3.5" color={GOAL_COLOR} />
        <Text
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: GOAL_COLOR }}
        >
          {goalLabel(goal.kind)}
        </Text>
      </View>

      <View className="mt-1 flex-row items-baseline">
        <Text className="text-2xl font-semibold" style={{ color: GOAL_COLOR }}>
          {roundWeight(goal.weight)}
        </Text>
        <Text variant="muted" className="ml-1 text-xs">
          {goal.unit}
        </Text>
        <Text variant="muted" className="mx-2 text-sm">
          ×
        </Text>
        <Text className="text-2xl font-semibold" style={{ color: GOAL_COLOR }}>
          {goal.reps}
        </Text>
        <Text variant="muted" className="ml-1 text-xs">
          reps
        </Text>
      </View>

      <Text variant="muted" className="mt-1.5 text-xs leading-5">
        {goal.reason}
      </Text>
    </View>
  );
}
