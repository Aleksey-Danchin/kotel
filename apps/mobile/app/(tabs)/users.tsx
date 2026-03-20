import { useQuery } from "@tanstack/react-query";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserRow } from "@/src/api/users";
import { usersQueryOptions } from "@/src/query-options/users";

export default function UsersScreen() {
  const usersQuery = useQuery({
    ...usersQueryOptions(),
    enabled: false,
  });

  const users = usersQuery.data ?? [];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Пользователи</ThemedText>

      <Pressable
        accessibilityRole="button"
        style={styles.loadButton}
        onPress={() => {
          void usersQuery.refetch();
        }}
      >
        <ThemedText type="defaultSemiBold">загрузить</ThemedText>
      </Pressable>

      {usersQuery.isFetching ? <ThemedText>Загрузка...</ThemedText> : null}

      {usersQuery.isError ? (
        <ThemedText style={styles.errorText}>
          Ошибка загрузки:{" "}
          {usersQuery.error instanceof Error
            ? usersQuery.error.message
            : "неизвестная ошибка"}
        </ThemedText>
      ) : null}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          usersQuery.isFetched && !usersQuery.isError ? (
            <ThemedText>Нет данных</ThemedText>
          ) : null
        }
        renderItem={({ item }) => <UserRowCard user={item} />}
      />
    </ThemedView>
  );
}

type UserRowCardProps = {
  user: UserRow;
};

function UserRowCard({ user }: UserRowCardProps) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="defaultSemiBold">id: {user.id}</ThemedText>
      <ThemedText>fullname: {user.fullname}</ThemedText>
      <ThemedText>createdAt: {user.createdAt}</ThemedText>
      <ThemedText>updatedAt: {user.updatedAt}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 24,
  },
  loadButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8a8a8a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 140,
  },
  errorText: {
    color: "#d64545",
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#404040",
    gap: 4,
    padding: 12,
  },
});
