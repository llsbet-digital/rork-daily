import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "@/providers/AppProvider";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isOnboarded, isAuthenticated, isLoading } = useApp();

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = segments[0] as string;
    const inOnboarding = currentSegment === 'onboarding' || currentSegment === 'onboarding-how' || currentSegment === 'onboarding-interests';
    const inAuth = currentSegment === 'auth';

    if (!isAuthenticated) {
      if (!inAuth) {
        router.replace('/auth' as any);
      }
    } else if (!isOnboarded) {
      if (!inOnboarding) {
        router.replace('/onboarding' as any);
      }
    } else if (inOnboarding || inAuth) {
      router.replace('/' as any);
    }
  }, [isOnboarded, isAuthenticated, isLoading, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="onboarding-how" />
      <Stack.Screen name="onboarding-interests" />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      <Stack.Screen name="premium" options={{ presentation: "modal" }} />
      <Stack.Screen name="article-reader" options={{ presentation: "modal", headerShown: false, gestureEnabled: true }} />
      <Stack.Screen name="manage-interests" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <AppProvider>
          <RootLayoutNav />
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
