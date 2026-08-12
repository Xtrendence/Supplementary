import 'react-native-reanimated';
import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { ThemeProvider as UIThemeProvider } from '@/components/ui/theme';
import { ErrorBoundary } from '@/components/error-boundary';
import { useTheme } from '@/lib/preferences';
import { navColors, themeVars } from '@/lib/themes';
import { maybePromptUpdate } from '@/lib/updates';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    maybePromptUpdate();
  }, []);

  if (!loaded) {
    return null;
  }

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme : DefaultTheme).colors,
      ...navColors(theme),
    },
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={themeVars(theme)} className="flex-1">
          <BottomSheetModalProvider>
            <UIThemeProvider theme={theme.dark ? 'dark' : 'light'}>
              <ThemeProvider value={navTheme}>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="exercise/[id]"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style={theme.dark ? 'light' : 'dark'} />
              </ThemeProvider>
            </UIThemeProvider>
          </BottomSheetModalProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
