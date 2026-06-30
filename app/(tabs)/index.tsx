import * as React from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView, ScrollView, Text, cn } from "@/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PillIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/lib/icons";
import { SupplementCard } from "@/components/SupplementCard";
import { SupplementForm } from "@/components/SupplementForm";
import { useShowUnscheduled, useTheme } from "@/lib/preferences";
import { themeVars } from "@/lib/themes";
import {
  addSupplement,
  dateFromKey,
  dateKey,
  deleteSupplement,
  earliestTakenKey,
  isScheduledOn,
  isTakenOn,
  type Supplement,
  type SupplementDraft,
  takenOnDate,
  toggleTaken,
  updateSupplement,
  useSupplements,
} from "@/lib/supplements";

function shiftKey(key: string, deltaDays: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + deltaDays);
  return dateKey(d);
}

export default function Home() {
  const supplements = useSupplements();
  const showUnscheduled = useShowUnscheduled();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplement | null>(null);
  const [jumpOpen, setJumpOpen] = React.useState(false);

  const todayKey = React.useMemo(() => dateKey(), []);
  const [viewedKey, setViewedKey] = React.useState(todayKey);
  const viewedDate = React.useMemo(() => dateFromKey(viewedKey), [viewedKey]);
  const isToday = viewedKey === todayKey;

  // Earliest day you can navigate to: the oldest data we have, but always at
  // least ~30 days back so a forgotten dose can be logged.
  const floorKey = React.useMemo(() => {
    let earliest = todayKey;
    for (const s of supplements) {
      const k = dateKey(new Date(s.createdAt));
      if (k < earliest) earliest = k;
    }
    const takenEarliest = earliestTakenKey(supplements);
    if (takenEarliest && takenEarliest < earliest) earliest = takenEarliest;
    const thirtyBack = shiftKey(todayKey, -30);
    return earliest < thirtyBack ? earliest : thirtyBack;
  }, [supplements, todayKey]);

  const canGoPrev = viewedKey > floorKey;
  const canGoNext = viewedKey < todayKey;

  const goPrev = () => {
    if (canGoPrev) setViewedKey((k) => shiftKey(k, -1));
  };
  const goNext = () => {
    if (canGoNext) setViewedKey((k) => shiftKey(k, 1));
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (supplement: Supplement) => {
    setEditing(supplement);
    setFormOpen(true);
  };

  const handleSubmit = (draft: SupplementDraft) => {
    if (editing) updateSupplement(editing.id, draft);
    else addSupplement(draft);
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (editing) deleteSupplement(editing.id);
    setFormOpen(false);
  };

  const ordered = React.useMemo(() => {
    const visible = showUnscheduled
      ? supplements
      : supplements.filter((s) => isScheduledOn(s, viewedDate));
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [supplements, showUnscheduled, viewedDate]);

  const hiddenCount = supplements.length - ordered.length;

  const scheduledCount = React.useMemo(
    () => supplements.filter((s) => isScheduledOn(s, viewedDate)).length,
    [supplements, viewedDate]
  );
  const takenCount = React.useMemo(
    () =>
      supplements.filter(
        (s) => isScheduledOn(s, viewedDate) && isTakenOn(s, viewedDate)
      ).length,
    [supplements, viewedDate]
  );
  const dueCount = scheduledCount - takenCount;

  const jumpItems = React.useMemo(() => {
    const items: { key: string; label: string; count: number }[] = [];
    let k = shiftKey(todayKey, -1);
    for (let i = 0; i < 400 && k >= floorKey; i++) {
      items.push({
        key: k,
        label: dateFromKey(k).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        count: takenOnDate(supplements, k).length,
      });
      k = shiftKey(k, -1);
    }
    return items;
  }, [todayKey, floorKey, supplements]);

  const dateLabel = viewedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const relative = isToday
    ? "Today"
    : viewedKey === shiftKey(todayKey, -1)
      ? "Yesterday"
      : null;

  const subtitle =
    supplements.length === 0
      ? null
      : isToday
        ? dueCount > 0
          ? `${dueCount} still to take today`
          : "All done for today 🎉"
        : scheduledCount > 0
          ? `${takenCount} of ${scheduledCount} logged`
          : "Nothing scheduled this day";

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <View className="flex-row items-end justify-between px-4 pb-3 pt-2">
        <View className="flex-1 pr-3">
          <Text variant="muted" className="text-xs uppercase tracking-widest">
            {relative ? `${relative} · ${dateLabel}` : dateLabel}
          </Text>
          <Text variant="h2" className="mt-0.5">
            Supplements
          </Text>
          {subtitle ? (
            <Text variant="muted" className="mt-0.5 text-sm">
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center">
          <ArrowButton
            disabled={!canGoPrev}
            onPress={goPrev}
            onLongPress={() => canGoPrev && setJumpOpen(true)}
            accessibilityLabel="Previous day"
          >
            <ChevronLeftIcon className="h-5 w-5 text-foreground" />
          </ArrowButton>
          <ArrowButton
            disabled={!canGoNext}
            onPress={goNext}
            onLongPress={() => setViewedKey(todayKey)}
            accessibilityLabel="Next day"
            className="ml-2"
          >
            <ChevronRightIcon className="h-5 w-5 text-foreground" />
          </ArrowButton>

          <View style={{ width: 24 }} />

          <Pressable
            onPress={openCreate}
            accessibilityLabel="Add supplement"
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
          >
            <PlusIcon className="h-6 w-6 text-primary-foreground" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-28 pt-1">
        {ordered.length === 0 ? (
          supplements.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : (
            <NothingScheduled hiddenCount={hiddenCount} />
          )
        ) : (
          <>
            {ordered.map((supplement) => (
              <SupplementCard
                key={supplement.id}
                supplement={supplement}
                date={viewedDate}
                onPress={() => openEdit(supplement)}
                onToggleTaken={() => toggleTaken(supplement.id, viewedDate)}
              />
            ))}
            {!showUnscheduled && hiddenCount > 0 ? (
              <Text variant="muted" className="mt-2 px-1 text-center text-xs">
                {hiddenCount} not scheduled this day · hidden
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <SupplementForm
        visible={formOpen}
        supplement={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />

      <DayJumpModal
        visible={jumpOpen}
        items={jumpItems}
        selectedKey={viewedKey}
        onSelect={(key) => {
          setViewedKey(key);
          setJumpOpen(false);
        }}
        onClose={() => setJumpOpen(false)}
      />
    </SafeAreaView>
  );
}

function ArrowButton({
  children,
  disabled,
  onPress,
  onLongPress,
  className,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-full border border-border active:bg-secondary",
        disabled && "opacity-40",
        className
      )}
    >
      {children}
    </Pressable>
  );
}

function DayJumpModal({
  visible,
  items,
  selectedKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  items: { key: string; label: string; count: number }[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
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
            <Text variant="h5">Jump to a day</Text>
            <View className="h-9 w-9" />
          </View>
          <ScrollView className="flex-1" contentContainerClassName="p-4">
            {items.length === 0 ? (
              <Text variant="muted" className="px-1 text-xs">
                No earlier days available.
              </Text>
            ) : (
              items.map((item) => {
                const active = item.key === selectedKey;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onSelect(item.key)}
                    className={cn(
                      "mb-2 flex-row items-center justify-between rounded-xl border px-4 py-3",
                      active
                        ? "border-primary bg-secondary"
                        : "border-border bg-card active:bg-secondary"
                    )}
                  >
                    <Text className={cn(active && "font-semibold text-primary")}>
                      {item.label}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {item.count > 0
                        ? `${item.count} logged`
                        : "nothing logged"}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
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

function NothingScheduled({ hiddenCount }: { hiddenCount: number }) {
  return (
    <View className="mt-24 items-center px-8">
      <View className="h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
        <PillIcon className="h-10 w-10 text-primary" />
      </View>
      <Text variant="h4" className="mt-5 text-center">
        Nothing scheduled
      </Text>
      <Text variant="muted" className="mt-2 text-center leading-6">
        You have {hiddenCount} supplement{hiddenCount === 1 ? "" : "s"} that
        aren&apos;t scheduled for this day. Turn on “Show unscheduled
        supplements” in Settings to see them all.
      </Text>
    </View>
  );
}
