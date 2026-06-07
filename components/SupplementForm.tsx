import * as React from "react";
import { Modal, Pressable, View } from "react-native";
import {
  Button,
  Input,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Text,
  cn,
} from "@/components/ui";
import {
  ChevronDownIcon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/lib/icons";
import { currencySymbol, useCurrency, useTheme } from "@/lib/preferences";
import { themeVars } from "@/lib/themes";
import {
  DAY_LABELS,
  type Supplement,
  type SupplementDraft,
  type SupplementUnit,
  UNIT_OPTIONS,
} from "@/lib/supplements";

interface SupplementFormProps {
  visible: boolean;
  supplement?: Supplement | null;
  onClose: () => void;
  onSubmit: (draft: SupplementDraft) => void;
  onDelete?: () => void;
}

const DAY_PRESETS: { label: string; days: number[] }[] = [
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text variant="small" className="mb-2 text-muted-foreground">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="muted" className="mt-1.5 text-xs">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function SupplementForm({
  visible,
  supplement,
  onClose,
  onSubmit,
  onDelete,
}: SupplementFormProps) {
  const isEditing = !!supplement;

  const [name, setName] = React.useState("");
  const [unit, setUnit] = React.useState<SupplementUnit>("pill");
  const [servingSize, setServingSize] = React.useState("1");
  const [days, setDays] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [containerAmount, setContainerAmount] = React.useState("");
  const [amountLeft, setAmountLeft] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [unitOpen, setUnitOpen] = React.useState(false);
  const currency = useCurrency();
  const theme = useTheme();

  React.useEffect(() => {
    if (!visible) return;
    setTouched(false);
    setUnitOpen(false);
    if (supplement) {
      setName(supplement.name);
      setUnit(supplement.unit);
      setServingSize(String(supplement.servingSize));
      setDays(supplement.days);
      setContainerAmount(String(supplement.containerAmount));
      setAmountLeft(String(supplement.amountLeft));
      setPrice(String(supplement.pricePerContainer));
    } else {
      setName("");
      setUnit("pill");
      setServingSize("1");
      setDays([0, 1, 2, 3, 4, 5, 6]);
      setContainerAmount("");
      setAmountLeft("");
      setPrice("");
    }
  }, [visible, supplement]);

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const num = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const nameValid = name.trim().length > 0;
  const canSave = nameValid && num(servingSize) > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSave) return;
    const container = num(containerAmount);
    const left = amountLeft.trim() === "" ? container : num(amountLeft);
    onSubmit({
      name: name.trim(),
      unit,
      servingSize: num(servingSize),
      days,
      containerAmount: container,
      amountLeft: left,
      pricePerContainer: num(price),
    });
  };

  const selectedUnit = UNIT_OPTIONS.find((u) => u.value === unit);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={themeVars(theme)} className="flex-1 bg-background">
        <SafeAreaView edges={["top"]} className="flex-1">
          <KeyboardAvoidingView className="flex-1">
            <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-secondary"
              >
                <XIcon className="h-5 w-5 text-muted-foreground" />
              </Pressable>
              <Text variant="h5">
                {isEditing ? "Edit supplement" : "New supplement"}
              </Text>
              <Button size="sm" onPress={handleSubmit} disabled={!canSave}>
                <Text className="font-semibold text-primary-foreground">Save</Text>
              </Button>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="p-4 pb-12"
              keyboardShouldPersistTaps="handled"
            >
              <Field label="Name">
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Vitamin D3"
                  autoFocus={!isEditing}
                  returnKeyType="next"
                />
                {touched && !nameValid ? (
                  <Text variant="muted" className="mt-1.5 text-xs text-destructive">
                    Please enter a name.
                  </Text>
                ) : null}
              </Field>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Serving size">
                    <Input
                      value={servingSize}
                      onChangeText={setServingSize}
                      placeholder="1"
                      keyboardType="decimal-pad"
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label="Unit">
                    <Pressable
                      onPress={() => setUnitOpen((open) => !open)}
                      className="native:h-12 h-10 flex-row items-center justify-between rounded-md border-2 border-input bg-background px-3"
                    >
                      <Text className="text-base text-foreground" numberOfLines={1}>
                        {selectedUnit?.label ?? "Select…"}
                      </Text>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-muted-foreground",
                          unitOpen && "rotate-180"
                        )}
                      />
                    </Pressable>
                  </Field>
                </View>
              </View>

              {unitOpen ? (
                <View className="-mt-2 mb-5 rounded-xl border border-border bg-secondary p-2">
                  <View className="flex-row flex-wrap gap-2">
                    {UNIT_OPTIONS.map((u) => {
                      const active = u.value === unit;
                      return (
                        <Pressable
                          key={u.value}
                          onPress={() => {
                            setUnit(u.value);
                            setUnitOpen(false);
                          }}
                          className={cn(
                            "rounded-full border px-4 py-2",
                            active
                              ? "border-primary bg-primary"
                              : "border-border bg-background"
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-medium",
                              active
                                ? "text-primary-foreground"
                                : "text-foreground"
                            )}
                          >
                            {u.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Field
                label="Days to take"
                hint={
                  days.length === 0
                    ? "No days selected — pick at least one to schedule it."
                    : undefined
                }
              >
                <View className="flex-row gap-1.5">
                  {DAY_LABELS.map((label, index) => {
                    const active = days.includes(index);
                    return (
                      <Pressable
                        key={label}
                        onPress={() => toggleDay(index)}
                        className={cn(
                          "flex-1 items-center justify-center rounded-lg border py-2.5",
                          active
                            ? "border-primary bg-primary"
                            : "border-border bg-secondary"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-xs font-semibold",
                            active
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {label[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View className="mt-2 flex-row gap-2">
                  {DAY_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.label}
                      onPress={() => setDays(preset.days)}
                      className="rounded-full border border-border px-3 py-1 active:bg-secondary"
                    >
                      <Text variant="muted" className="text-xs">
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Amount per container">
                    <Input
                      value={containerAmount}
                      onChangeText={setContainerAmount}
                      placeholder="60"
                      keyboardType="decimal-pad"
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label="Amount left">
                    <Input
                      value={amountLeft}
                      onChangeText={setAmountLeft}
                      placeholder={containerAmount || "60"}
                      keyboardType="decimal-pad"
                    />
                  </Field>
                </View>
              </View>

              <Field label="Price per container" hint="Used to estimate cost per dose.">
                <View className="native:h-12 h-10 flex-row items-center rounded-md border-2 border-input bg-background px-3">
                  <Text className="mr-1 text-base text-muted-foreground">
                    {currencySymbol(currency)}
                  </Text>
                  <Input
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className="h-full flex-1 rounded-none border-0 bg-transparent px-0"
                  />
                </View>
              </Field>

              {isEditing && onDelete ? (
                <Button
                  variant="ghost"
                  onPress={onDelete}
                  className="mt-2 flex-row gap-2"
                >
                  <Trash2Icon className="h-4 w-4 text-destructive" />
                  <Text className="font-medium text-destructive">
                    Delete supplement
                  </Text>
                </Button>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
