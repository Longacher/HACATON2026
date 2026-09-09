import { useState } from "react";
import { SafeAreaView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { S } from "./src/theme";
import { Done, Home, New, Track } from "./src/screens/public";
import { Admin, Expert, Login, Operator } from "./src/screens/staff";

function App() {
  const [screen, setScreen] = useState("home");
  const nav = (s: string) => setScreen(s);
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ef" }}>
        <View style={S.nav}>
          <TouchableOpacity onPress={() => nav("home")}><Text style={S.navLogo}>Отклик</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => nav("track")}><Text style={S.navLink}>Статус</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => nav("login")}><Text style={S.navLink}>Вход</Text></TouchableOpacity>
        </View>
        {screen === "home" && <Home nav={nav} />}
        {screen === "new" && <New nav={nav} />}
        {screen === "done" && <Done nav={nav} />}
        {screen === "track" && <Track />}
        {screen === "login" && <Login nav={nav} />}
        {screen === "operator" && <Operator />}
        {screen === "expert" && <Expert />}
        {screen === "admin" && <Admin />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
