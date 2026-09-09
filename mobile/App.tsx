import { useEffect } from "react";
import { Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import Home from "./src/screens/Home";
import Submit from "./src/screens/Submit";
import Track from "./src/screens/Track";
import Result from "./src/screens/Result";
import { ThemeProvider, useTheme } from "./src/theme";
import { ToastProvider } from "./src/toast";

export type RootStackParamList = {
  Home: undefined;
  Submit: { applicantType?: string };
  Result: { trackNumber: string };
  Track: { initialTrack?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ["otklik://"],
  config: {
    screens: {
      Home: "",
      Submit: "submit",
      Result: "result",
      Track: "track/:initialTrack",
    },
  },
};

export function trackLink(trackNumber: string): string {
  return `otklik://track/${encodeURIComponent(trackNumber)}`;
}

function ThemedNav() {
  const { C, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "night" ? "light" : "dark"} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: C.surface },
          headerTintColor: C.tealDeep,
          headerTitleStyle: { fontWeight: "700", color: C.ink },
          contentStyle: { backgroundColor: C.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            headerTitle: () => null,
            headerLeft: () => (
              <Image
                source={require("./assets/icon.png")}
                style={{ width: 34, height: 34, borderRadius: 12, marginLeft: 6 }}
                accessibilityLabel="Логотип Отклика"
              />
            ),
          }}
        />
        <Stack.Screen name="Submit" component={Submit} options={{ title: "Расскажите о ситуации" }} />
        <Stack.Screen name="Result" component={Result} options={{ title: "Обращение получено" }} />
        <Stack.Screen name="Track" component={Track} options={{ title: "Моё обращение" }} />
      </Stack.Navigator>
    </>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <ThemeProvider>
      <ToastProvider>
        <NavigationContainer linking={linking as any}>
          <ThemedNav />
        </NavigationContainer>
      </ToastProvider>
    </ThemeProvider>
  );
}
