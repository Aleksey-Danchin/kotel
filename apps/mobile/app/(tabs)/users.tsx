import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function UsersScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Users</ThemedText>
      <ThemedText>
        Экран пользователей будет добавлен в следующих шагах.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
});
