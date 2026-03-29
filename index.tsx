import { registerRootComponent } from 'expo';
import React, { useState, useEffect } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ActivityIndicator, View } from 'react-native';
import * as Font from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import App from './App';

// @ts-ignore - EXPO_PUBLIC_ vars are inlined at build time by Expo
const convexUrl: string = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

const convex = new ConvexReactClient(convexUrl);

function Root() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync(Ionicons.font).then(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  );
}

registerRootComponent(Root);
