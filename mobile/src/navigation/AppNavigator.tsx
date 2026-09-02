/**
 * WeatherGPT — Stack Navigator
 * Routes: Splash → Onboarding → Home → Response → Map → History → Settings
 */

import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/SplashScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen from "../screens/HomeScreen";
import LoadingScreen from "../screens/LoadingScreen";
import ResponseScreen from "../screens/ResponseScreen";
import MapScreen from "../screens/MapScreen";
import VoiceInputScreen from "../screens/VoiceInputScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import OfflineFallbackScreen from "../screens/OfflineFallbackScreen";

// Dark theme matching the app's premium aesthetic
const WeatherGPTTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: "#60A5FA",       // Blue-400
    background: "#0F172A",    // Slate-900
    card: "#1E293B",          // Slate-800
    text: "#F1F5F9",          // Slate-100
    border: "#334155",        // Slate-700
    notification: "#F59E0B",  // Amber-500
  },
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Home: undefined;
  Loading: { queryText: string; personaType: string; language?: string };
  Response: {
    response: any;
    queryText: string;
    personaType: string;
  };
  Map: { initialMode?: "temp" | "radar" } | undefined;
  VoiceInput: undefined;
  History: undefined;
  Settings: undefined;
  OfflineFallback: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer theme={WeatherGPTTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#0F172A" },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen as any} />
        <Stack.Screen name="Response" component={ResponseScreen as any} />
        <Stack.Screen name="Map" component={MapScreen as any} />
        <Stack.Screen name="VoiceInput" component={VoiceInputScreen as any} />
        <Stack.Screen name="History" component={HistoryScreen as any} />
        <Stack.Screen name="Settings" component={SettingsScreen as any} />
        <Stack.Screen name="OfflineFallback" component={OfflineFallbackScreen as any} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
