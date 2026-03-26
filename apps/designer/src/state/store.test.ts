import { describe, expect, it } from "vitest";
import { findOrCreatePersonChat, getServerChats } from "./store";

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
