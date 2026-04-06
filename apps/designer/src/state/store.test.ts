import { describe, expect, it } from "vitest";
import { defaultStore } from "../global/defaultStore";
import {
  allUsersForSelectedServerAtom,
  createServerUser,
  findOrCreatePersonChat,
  getServerUsers,
  getServerChats,
  routeContextAtom,
  resolveRouteContextForPathname,
  resolveNextActiveServerId,
  resolvePersonChatPeer,
  selectedServerAtom,
  updateServerUser,
  type ChatPreview,
  type MockUser,
} from "./store";
import { activeServerIdAtom } from "./selectionAtoms";
import { serversAtom } from "./servers";
import { serverRouteIdFromServerUrl } from "./serverRouteId";

describe("findOrCreatePersonChat", () => {
  it("creates DM once and reuses it for repeated clicks", () => {
    const serverId = "srv_local";
    const peerUserId = "peer-qa";
    const before = getServerChats(serverId).length;

    const created = findOrCreatePersonChat(serverId, peerUserId);
    expect(created).not.toBeNull();
    expect(created?.type).toBe("person");

    const afterCreate = getServerChats(serverId).length;
    expect(afterCreate).toBe(before + 1);

    const reused = findOrCreatePersonChat(serverId, peerUserId);
    expect(reused?.id).toBe(created?.id);
    expect(getServerChats(serverId).length).toBe(afterCreate);
  });
});

describe("resolvePersonChatPeer", () => {
  const users: MockUser[] = [
    {
      id: "peer-1",
      fullname: "Анна QA",
      login: "anna",
      role: "user",
      isOnline: true,
      lastSeenAt: "2026-03-20T10:30:00.000Z",
    },
  ];

  it("returns null for group chats", () => {
    const groupChat: ChatPreview = {
      id: "chat-group-1",
      type: "group",
      title: "Команда продукта",
      subtitle: "Обсуждение",
      unread: 0,
    };
    expect(resolvePersonChatPeer(groupChat, users)).toBeNull();
  });

  it("resolves peer by peerName and keeps person chats role-independent", () => {
    const personChat: ChatPreview = {
      id: "chat-person-1",
      type: "person",
      title: "Скрытый заголовок",
      peerName: "Анна QA",
      subtitle: "Личные сообщения",
      unread: 1,
    };
    expect(resolvePersonChatPeer(personChat, users)?.id).toBe("peer-1");
  });
});

describe("settings users mutations", () => {
  it("creates user and links it to server", () => {
    const serverId = "srv_local";
    const beforeCount = getServerUsers(serverId).length;
    const created = createServerUser({
      serverId,
      login: "new-user",
      fullname: "New User",
      password: "AbCdEf123456",
    });

    const serverUsers = getServerUsers(serverId);
    expect(serverUsers.length).toBe(beforeCount + 1);
    expect(serverUsers.some((user) => user.id === created.id)).toBe(true);
  });

  it("updates editable fields of existing user", () => {
    const existing = getServerUsers("srv_local")[0];
    expect(existing).toBeDefined();

    updateServerUser({
      id: existing.id,
      login: "updated-login",
      fullname: "Updated User",
      password: "QwErTy123456",
      blocked: true,
      role: "ADMIN",
    });

    const updated = getServerUsers("srv_local").find((user) => user.id === existing.id);
    expect(updated?.login).toBe("updated-login");
    expect(updated?.fullname).toBe("Updated User");
    expect(updated?.password).toBe("QwErTy123456");
    expect(updated?.blocked).toBe(true);
    expect(updated?.role).toBe("ADMIN");
  });

  it("updates allUsersForSelectedServerAtom after creating user", () => {
    defaultStore.set(routeContextAtom, {
      type: "server",
      serverId: "localhost.5173",
    });
    const before = defaultStore.get(allUsersForSelectedServerAtom).length;

    createServerUser({
      serverId: "srv_local",
      login: "reactive-user",
      fullname: "Reactive User",
      password: "QwErTy123456",
    });

    const after = defaultStore.get(allUsersForSelectedServerAtom).length;
    expect(after).toBe(before + 1);
  });
});

describe("hierarchical route resolution fallbacks", () => {
  const validServerUrl = "http://localhost:5173";
  const validServerId = serverRouteIdFromServerUrl(validServerUrl);

  it("falls back to home for unknown server in selection routes", () => {
    const servers = defaultStore.get(serversAtom);
    expect(resolveRouteContextForPathname("/unknown-server", servers)).toEqual({
      type: "index",
    });
    expect(
      resolveRouteContextForPathname("/unknown-server/chat_general", servers),
    ).toEqual({
      type: "index",
    });
  });

  it("falls back to /:serverId when chat is missing under valid server", () => {
    const servers = defaultStore.get(serversAtom);
    expect(
      resolveRouteContextForPathname(`/${validServerId}/missing-chat`, servers),
    ).toEqual({
      type: "server",
      serverId: validServerId,
    });
  });

  it("falls back to /config for unknown server in config route", () => {
    const servers = defaultStore.get(serversAtom);
    expect(
      resolveRouteContextForPathname("/config/unknown-server", servers),
    ).toEqual({
      type: "config",
    });
  });
});

describe("active server and selected server behavior", () => {
  const validServerUrl = "http://localhost:5173";
  const validServerId = serverRouteIdFromServerUrl(validServerUrl);

  it("keeps active server for /config and clears on index", () => {
    expect(resolveNextActiveServerId({ type: "config" }, validServerId)).toBe(
      validServerId,
    );
    expect(resolveNextActiveServerId({ type: "index" }, validServerId)).toBeNull();
  });

  it("does not infer selected server from active id on index/config", () => {
    defaultStore.set(activeServerIdAtom, validServerId);
    defaultStore.set(routeContextAtom, { type: "index" });
    expect(defaultStore.get(selectedServerAtom)).toBeNull();

    defaultStore.set(routeContextAtom, { type: "config" });
    expect(defaultStore.get(selectedServerAtom)).toBeNull();
  });
});
