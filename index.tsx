import { registerRootComponent } from 'expo';
import React from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import App from './App';

// @ts-ignore - EXPO_PUBLIC_ vars are inlined at build time by Expo
const convexUrl: string = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

const convex = new ConvexReactClient(convexUrl);

function Root() {
  return (
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  );
}

registerRootComponent(Root);
