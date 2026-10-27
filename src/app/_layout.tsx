import { Stack, router } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { StoreProvider } from '../store';
import { Button, ErrorText, Page, useColors } from '../ui';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <Page><ErrorText message={error.message} /><Button title="Try again" onPress={retry} /><Button title="Return home" secondary onPress={() => router.replace('/')} /></Page>;
}
export default function Layout() {
  const c = useColors();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);
  return <SafeAreaProvider><StoreProvider><StatusBar style="auto" /><Stack screenOptions={{ headerStyle: { backgroundColor: c.background }, headerTintColor: c.text, contentStyle: { backgroundColor: c.background }, headerShadowVisible: false, animation: reduceMotion ? 'none' : 'default' }}>
    <Stack.Screen name="index" options={{ title: 'ShopScan' }} />
    <Stack.Screen name="sessions/new" options={{ title: 'New shopping trip' }} />
    <Stack.Screen name="sessions/[id]/index" options={{ title: 'Shopping session' }} />
    <Stack.Screen name="sessions/[id]/item" options={{ title: 'Item details' }} />
    <Stack.Screen name="sessions/[id]/scan" options={{ title: 'Scan a barcode' }} />
    <Stack.Screen name="sessions/[id]/review" options={{ title: 'Review your trip' }} />
  </Stack></StoreProvider></SafeAreaProvider>;
}
