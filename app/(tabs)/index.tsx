import * as React from "react";
import { Pressable, View } from "react-native";
import {
  SafeAreaView,
  ScrollView,
  Text,
} from "@/components/ui";
import { PillIcon, PlusIcon } from "@/components/ui/lib/icons";
import { SupplementCard } from "@/components/SupplementCard";
import { SupplementForm } from "@/components/SupplementForm";
import {
  addSupplement,
  deleteSupplement,
  isScheduledOn,
  isTakenOn,
  type Supplement,
  type SupplementDraft,
  toggleTaken,
  updateSupplement,
  useSupplements,
} from "@/lib/supplements";

export default function Home() {
  const supplements = useSupplements();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplement | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (supplement: Supplement) => {
    setEditing(supplement);
    setFormOpen(true);
  };

  const handleSubmit = (draft: SupplementDraft) => {
    if (editing) {
      updateSupplement(editing.id, draft);
    } else {
      addSupplement(draft);
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (editing) deleteSupplement(editing.id);
    setFormOpen(false);
  };

  const ordered = React.useMemo(() => {
    return [...supplements].sort((a, b) => a.name.localeCompare(b.name));
  }, [supplements]);

  const dueCount = React.useMemo(
    () => supplements.filter((s) => isScheduledOn(s) && !isTakenOn(s)).length,
    [supplements]
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <View className="flex-row items-end justify-between px-4 pb-3 pt-2">
        <View>
          <Text variant="muted" className="text-xs uppercase tracking-widest">
            {today}
          </Text>
          <Text variant="h2" className="mt-0.5">
            Supplements
          </Text>
          {supplements.length > 0 ? (
            <Text variant="muted" className="mt-0.5 text-sm">
              {dueCount > 0
                ? `${dueCount} still to take today`
                : "All done for today 🎉"}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={openCreate}
          accessibilityLabel="Add supplement"
          className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <PlusIcon className="h-6 w-6 text-primary-foreground" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-1"
      >
        {ordered.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          ordered.map((supplement) => (
            <SupplementCard
              key={supplement.id}
              supplement={supplement}
              onPress={() => openEdit(supplement)}
              onToggleTaken={() => toggleTaken(supplement.id)}
            />
          ))
        )}
      </ScrollView>

      <SupplementForm
        visible={formOpen}
        supplement={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />
    </SafeAreaView>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="mt-24 items-center px-8">
      <View className="h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
        <PillIcon className="h-10 w-10 text-primary" />
      </View>
      <Text variant="h4" className="mt-5 text-center">
        Build your stack
      </Text>
      <Text variant="muted" className="mt-2 text-center leading-6">
        Add the supplements you take and Supplementary will track your daily
        doses and how many days of supply you have left.
      </Text>
      <Pressable
        onPress={onAdd}
        className="mt-6 flex-row items-center gap-2 rounded-full bg-primary px-5 py-3 active:opacity-80"
      >
        <PlusIcon className="h-5 w-5 text-primary-foreground" />
        <Text className="font-semibold text-primary-foreground">
          Add your first supplement
        </Text>
      </Pressable>
    </View>
  );
}
