import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { addMobileServer } from "@/src/api/auth";
import {
  forceMobileSessionRefresh,
  getMobileSessionStatus,
  logoutMobileSession,
  type MobileSessionStatusResponse,
} from "@/src/api/session";
import { clearTokens, getAccessToken, getRefreshToken } from "@/src/api/secure-store";
import {
  activeServerUrlAtom,
  serversAtom,
  type MobileServerSession,
} from "@/src/state/servers";

type TokenPreview = {
  access: string | null;
  refresh: string | null;
};

function truncateToken(value: string | null): string {
  if (!value) {
    return "нет токена";
  }

  return value.length <= 8 ? value : `${value.slice(0, 8)}...`;
}

function normalizeServerUrl(value: string): string {
  return value.trim();
}

export default function SessionTestScreen() {
  const [serversMap, setServersMap] = useAtom(serversAtom);
  const [, setActiveServerUrl] = useAtom(activeServerUrlAtom);
  const servers = useMemo(() => Array.from(serversMap.values()), [serversMap]);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusyByServer, setIsBusyByServer] = useState<Record<string, boolean>>({});
  const [statusByServer, setStatusByServer] = useState<
    Record<string, MobileSessionStatusResponse | null>
  >({});
  const [tokensByServer, setTokensByServer] = useState<Record<string, TokenPreview>>({});

  async function onAddServer() {
    const normalizedServerUrl = normalizeServerUrl(serverUrl);
    if (!normalizedServerUrl) {
      setError("Введите адрес сервера");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const status = await addMobileServer(normalizedServerUrl);
      const session: MobileServerSession = {
        serverUrl: normalizedServerUrl,
        sessionId: status.sessionId,
        user: {
          id: status.user.id,
          fullname: status.user.fullname,
          login: "",
          role: status.user.role,
        },
      };

      setServersMap((current) => {
        const next = new Map(current);
        next.set(normalizedServerUrl, session);
        return next;
      });
      setActiveServerUrl(normalizedServerUrl);
      setServerUrl("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Не удалось добавить сервер");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function withServerAction(
    targetServerUrl: string,
    action: () => Promise<void>,
  ): Promise<void> {
    setIsBusyByServer((current) => ({ ...current, [targetServerUrl]: true }));
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Операция завершилась с ошибкой",
      );
    } finally {
      setIsBusyByServer((current) => ({ ...current, [targetServerUrl]: false }));
    }
  }

  function removeServer(targetServerUrl: string) {
    setServersMap((current) => {
      if (!current.has(targetServerUrl)) {
        return current;
      }

      const next = new Map(current);
      next.delete(targetServerUrl);
      return next;
    });
    setStatusByServer((current) => {
      const next = { ...current };
      delete next[targetServerUrl];
      return next;
    });
    setTokensByServer((current) => {
      const next = { ...current };
      delete next[targetServerUrl];
      return next;
    });
    setActiveServerUrl((current) => (current === targetServerUrl ? null : current));
  }

  async function onCheckStatus(targetServerUrl: string) {
    await withServerAction(targetServerUrl, async () => {
      const status = await getMobileSessionStatus(targetServerUrl);
      setStatusByServer((current) => ({ ...current, [targetServerUrl]: status }));
      setServersMap((current) => {
        const existing = current.get(targetServerUrl);
        if (!existing) {
          return current;
        }

        const next = new Map(current);
        next.set(targetServerUrl, {
          ...existing,
          sessionId: status.sessionId,
          user: {
            id: status.user.id,
            fullname: status.user.fullname,
            login: status.user.login ?? existing.user.login,
            role: status.user.role,
          },
        });
        return next;
      });
    });
  }

  async function onForceRefresh(targetServerUrl: string) {
    await withServerAction(targetServerUrl, async () => {
      await forceMobileSessionRefresh(targetServerUrl);
      const status = await getMobileSessionStatus(targetServerUrl);
      setStatusByServer((current) => ({ ...current, [targetServerUrl]: status }));
    });
  }

  async function onLogout(targetServerUrl: string, allDevices: boolean) {
    await withServerAction(targetServerUrl, async () => {
      await logoutMobileSession(targetServerUrl, allDevices);
      await clearTokens(targetServerUrl);
      removeServer(targetServerUrl);
    });
  }

  async function onReadTokens(targetServerUrl: string) {
    await withServerAction(targetServerUrl, async () => {
      const [access, refresh] = await Promise.all([
        getAccessToken(targetServerUrl),
        getRefreshToken(targetServerUrl),
      ]);
      setTokensByServer((current) => ({
        ...current,
        [targetServerUrl]: {
          access: truncateToken(access),
          refresh: truncateToken(refresh),
        },
      }));
    });
  }

  const renderServer: ListRenderItem<MobileServerSession> = ({ item }) => {
    const status = statusByServer[item.serverUrl];
    const tokenPreview = tokensByServer[item.serverUrl];
    const isBusy = Boolean(isBusyByServer[item.serverUrl]);

    return (
      <ThemedView style={styles.serverCard}>
        <ThemedText type="defaultSemiBold">{item.serverUrl}</ThemedText>
        <ThemedText>
          {item.user.fullname} ({item.user.login || "no-login"}) - {item.user.role}
        </ThemedText>
        <ThemedText style={styles.metaText}>sessionId: {item.sessionId}</ThemedText>
        {status ? (
          <ThemedText style={styles.metaText}>
            status.sessionId: {status.sessionId}
          </ThemedText>
        ) : null}
        {tokenPreview ? (
          <View style={styles.tokenBlock}>
            <ThemedText style={styles.metaText}>
              access: {truncateToken(tokenPreview.access)}
            </ThemedText>
            <ThemedText style={styles.metaText}>
              refresh: {truncateToken(tokenPreview.refresh)}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, isBusy && styles.disabledButton]}
            disabled={isBusy}
            onPress={() => void onCheckStatus(item.serverUrl)}
          >
            <ThemedText type="defaultSemiBold">Check status</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, isBusy && styles.disabledButton]}
            disabled={isBusy}
            onPress={() => void onLogout(item.serverUrl, false)}
          >
            <ThemedText type="defaultSemiBold">Logout</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, isBusy && styles.disabledButton]}
            disabled={isBusy}
            onPress={() => void onLogout(item.serverUrl, true)}
          >
            <ThemedText type="defaultSemiBold">Logout all devices</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, isBusy && styles.disabledButton]}
            disabled={isBusy}
            onPress={() => void onForceRefresh(item.serverUrl)}
          >
            <ThemedText type="defaultSemiBold">Force refresh</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, isBusy && styles.disabledButton]}
            disabled={isBusy}
            onPress={() => void onReadTokens(item.serverUrl)}
          >
            <ThemedText type="defaultSemiBold">Read tokens</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Session test</ThemedText>
      <ThemedText>Экран ручной проверки OAuth и управления мобильной сессией.</ThemedText>

      <ThemedView style={styles.formCard}>
        <ThemedText type="defaultSemiBold">Добавить сервер</ThemedText>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://kotel.localhost"
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          editable={!isSubmitting}
        />
        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          disabled={isSubmitting}
          onPress={() => void onAddServer()}
        >
          <ThemedText type="defaultSemiBold">
            {isSubmitting ? "Подключение..." : "Add server"}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <FlatList
        data={servers}
        keyExtractor={(item) => item.serverUrl}
        renderItem={renderServer}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<ThemedText>Серверы не подключены.</ThemedText>}
      />

      <ThemedView style={styles.rawStateCard}>
        <ThemedText type="defaultSemiBold">Raw state</ThemedText>
        <ThemedText style={styles.rawStateText}>
          {JSON.stringify(Array.from(serversMap.entries()), null, 2)}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 20,
  },
  formCard: {
    borderRadius: 10,
    borderColor: "#454545",
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7a7a7a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#f3f3f3",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6ea8ff",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: "#d64545",
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  serverCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#454545",
    gap: 8,
    padding: 12,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#848484",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  metaText: {
    color: "#b0b0b0",
    fontSize: 12,
  },
  tokenBlock: {
    gap: 4,
  },
  rawStateCard: {
    borderRadius: 10,
    borderColor: "#454545",
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  rawStateText: {
    fontFamily: "monospace",
    fontSize: 11,
  },
});
