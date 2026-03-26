import { describe, expect, it } from "vitest";
import {
  findOrCreatePersonChat,
  getServerChats,
  resolvePersonChatPeer,
  type ChatPreview,
  type MockUser,
} from "./store";

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
