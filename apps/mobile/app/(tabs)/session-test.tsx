import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { signin, signout } from "@/src/api/session";
import { sessionCheckQueryOptions } from "@/src/query-options/session";
import { sessionErrorAtom, sessionUserAtom } from "@/src/state/session";

export default function SessionTestScreen() {
  const [sessionUser, setSessionUser] = useAtom(sessionUserAtom);
  const [sessionError, setSessionError] = useAtom(sessionErrorAtom);

  const checkQuery = useQuery({
    ...sessionCheckQueryOptions(),
    enabled: false,
  });

  const signinMutation = useMutation({
    mutationFn: signin,
    onSuccess: (user) => {
      setSessionUser(user);
      setSessionError(null);
    },
    onError: (error) => {
      setSessionError(error instanceof Error ? error.message : "Ошибка signin");
    },
  });

  const signoutMutation = useMutation({
    mutationFn: signout,
    onSuccess: () => {
      setSessionUser(null);
      setSessionError(null);
    },
    onError: (error) => {
      setSessionError(error instanceof Error ? error.message : "Ошибка signout");
    },
  });

  async function handleCheck() {
    const result = await checkQuery.refetch();

    if (result.error) {
      setSessionError(
        result.error instanceof Error ? result.error.message : "Ошибка check",
      );
      return;
    }

    setSessionUser(result.data ?? null);
    setSessionError(null);
  }

  const isRequestInProgress =
    signinMutation.isPending || signoutMutation.isPending || checkQuery.isFetching;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Session Test</ThemedText>

      <ThemedView style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.actionButton}
          onPress={() => {
            signinMutation.mutate({ login: "user1", password: "123" });
          }}
          disabled={signinMutation.isPending}
        >
          <ThemedText type="defaultSemiBold">signin</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.actionButton}
          onPress={() => {
            signoutMutation.mutate();
          }}
          disabled={signoutMutation.isPending}
        >
          <ThemedText type="defaultSemiBold">signout</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.actionButton}
          onPress={() => {
            void handleCheck();
          }}
          disabled={checkQuery.isFetching}
        >
          <ThemedText type="defaultSemiBold">check</ThemedText>
        </Pressable>
      </ThemedView>

      {isRequestInProgress ? <ThemedText>Запрос выполняется...</ThemedText> : null}

      {sessionError ? (
        <ThemedText style={styles.errorText}>Ошибка: {sessionError}</ThemedText>
      ) : null}

      <ThemedView style={styles.stateCard}>
        <ThemedText type="defaultSemiBold">Текущее состояние сессии</ThemedText>
        <ThemedText style={styles.jsonState}>
          {JSON.stringify(sessionUser, null, 2)}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 24,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    alignItems: "center",
    borderColor: "#8a8a8a",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: "#d64545",
  },
  stateCard: {
    borderColor: "#404040",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  jsonState: {
    fontFamily: "monospace",
  },
});
