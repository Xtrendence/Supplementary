import * as React from "react";
import { Pressable, View } from "react-native";
import { Text, cn } from "@/components/ui";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/lib/icons";
import { THEMES, type Theme, hsl } from "@/lib/themes";

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      variant="muted"
      className={cn("mb-2 px-1 text-xs uppercase tracking-widest", className)}
    >
      {children}
    </Text>
  );
}

export function SettingsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      {children}
    </View>
  );
}

export function Divider() {
  return <View className="h-px bg-border" />;
}

export function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center gap-3 p-4 active:bg-secondary",
        disabled && !loading && "opacity-50"
      )}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-medium">{title}</Text>
        <Text variant="muted" className="text-xs">
          {subtitle}
        </Text>
      </View>
      {loading ? (
        <Text variant="muted" className="text-xs">
          Working…
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CollapsibleRow({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <Pressable
        onPress={onToggle}
        className="flex-row items-center gap-3 p-4 active:bg-secondary"
      >
        {icon ? (
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            {icon}
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="font-medium">{title}</Text>
          <Text variant="muted" className="text-xs">
            {subtitle}
          </Text>
        </View>
        <ChevronDownIcon
          className={cn("h-5 w-5 text-muted-foreground", open && "rotate-180")}
        />
      </Pressable>
      {open ? (
        <View>
          <Divider />
          {children}
        </View>
      ) : null}
    </>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row rounded-full border border-border bg-secondary p-1",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5",
              active && "bg-primary"
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                active ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Full-width version used for the top-level Supplements / Workout switch. */
export function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: {
    value: T;
    label: string;
    /** Rendered per state so the icon can match the active text colour. */
    icon?: (active: boolean) => React.ReactNode;
  }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-2xl border border-border bg-secondary p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3",
              active ? "bg-primary" : "active:bg-accent"
            )}
          >
            {option.icon?.(active)}
            <Text
              className={cn(
                "font-semibold",
                active ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ThemePicker({
  activeThemeId,
  onSelect,
}: {
  activeThemeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="px-3 pb-1">
      <View className="mt-3 flex-row flex-wrap justify-between">
        {THEMES.map((theme) => (
          <ThemeTile
            key={theme.id}
            theme={theme}
            active={theme.id === activeThemeId}
            onPress={() => onSelect(theme.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ThemeTile({
  theme,
  active,
  onPress,
}: {
  theme: Theme;
  active: boolean;
  onPress: () => void;
}) {
  const p = theme.palette;
  return (
    <Pressable onPress={onPress} style={{ width: "48%" }} className="mb-3">
      <View
        className="rounded-2xl border-2 p-2.5"
        style={{
          backgroundColor: hsl(p.background),
          borderColor: active ? hsl(p.primary) : hsl(p.border),
        }}
      >
        <View className="flex-row items-center justify-between">
          <View
            style={{
              backgroundColor: hsl(p.foreground),
              width: 44,
              height: 7,
              borderRadius: 4,
            }}
          />
          <View
            style={{
              backgroundColor: hsl(p.primary),
              width: 14,
              height: 14,
              borderRadius: 7,
            }}
          />
        </View>

        <View
          className="mt-2.5 rounded-lg p-2"
          style={{
            backgroundColor: hsl(p.card),
            borderWidth: 1,
            borderColor: hsl(p.border),
          }}
        >
          <View
            style={{
              backgroundColor: hsl(p.foreground),
              width: "70%",
              height: 6,
              borderRadius: 3,
            }}
          />
          <View
            className="mt-1.5"
            style={{
              backgroundColor: hsl(p.mutedForeground),
              width: "45%",
              height: 5,
              borderRadius: 3,
            }}
          />
          <View
            className="mt-2 overflow-hidden rounded-full"
            style={{ backgroundColor: hsl(p.secondary), height: 6 }}
          >
            <View
              style={{
                backgroundColor: hsl(p.primary),
                width: "60%",
                height: 6,
              }}
            />
          </View>
        </View>

        <View className="mt-2 flex-row" style={{ gap: 4 }}>
          <View
            style={{
              backgroundColor: hsl(p.primary),
              width: 24,
              height: 10,
              borderRadius: 5,
            }}
          />
          <View
            style={{
              backgroundColor: hsl(p.accent),
              width: 16,
              height: 10,
              borderRadius: 5,
            }}
          />
          <View
            style={{
              backgroundColor: hsl(p.destructive),
              width: 10,
              height: 10,
              borderRadius: 5,
            }}
          />
        </View>
      </View>

      <View className="mt-1.5 flex-row items-center justify-between px-0.5">
        <Text variant="small" numberOfLines={1} className="flex-1 pr-1">
          {theme.name}
        </Text>
        {active ? <CheckIcon className="h-4 w-4 text-primary" /> : null}
      </View>
    </Pressable>
  );
}
