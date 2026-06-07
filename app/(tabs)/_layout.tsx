import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useTheme } from "@/lib/preferences";
import { hsl } from "@/lib/themes";

export default function TabLayout() {
  const theme = useTheme();

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
