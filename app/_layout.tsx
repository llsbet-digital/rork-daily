import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  CrimsonText_400Regular,
  CrimsonText_600SemiBold,
  CrimsonText_700Bold,
} from "@expo-google-fonts/crimson-text";
import { AppProvider, useApp } from "@/providers/AppProvider";
import Colors from "@/constants/colors";

void SplashScreen.preventAutoHideAsync();

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
  }, [isOnboarded, isAuthenticated, isLoading, segments, router]);

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
      <Stack.Screen name="manage-interests" options={{ presentation: "modal" }} />
      <Stack.Screen name="manage-resources" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding-sources" />
      <Stack.Screen name="article" />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({
    CrimsonText_400Regular,
    CrimsonText_600SemiBold,
    CrimsonText_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <RootLayoutNav />
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
