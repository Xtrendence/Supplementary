import { Tabs, router } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { getDefaultSection, useTheme } from "@/lib/preferences";
import { hsl } from "@/lib/themes";

/** The app always launches at "/", which resolves to the Supplements tab, so
 *  opening on Workout means navigating once at startup.
 *
 *  This guard lives at module scope rather than in a ref because `replace`
 *  rewrites the navigation state, which remounts this layout — a per-mount
 *  guard would navigate again on every remount, and the resulting loop leaks
 *  memory until the app is killed by the OS. */
let hasLanded = false;

export default function TabLayout() {
  const theme = useTheme();

  React.useEffect(() => {
    if (hasLanded) return;
    hasLanded = true;
    if (getDefaultSection() === "workout") router.replace("/workout");
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: hsl(theme.palette.primary),
        tabBarInactiveTintColor: hsl(theme.palette.mutedForeground),
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: hsl(theme.palette.card),
          borderTopColor: hsl(theme.palette.border),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Supplements",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="pills.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="dumbbell.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="gearshape" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
