import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Written by `pnpm verify:native` after the install: it imports every item, so
// `expo export` bundles all of them.
import * as installed from "./src/installed";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>{Object.keys(installed).length} Corsair Native modules bundled</Text>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
