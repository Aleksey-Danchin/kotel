import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { doRefresh, initPort } from "./shared-refresh-worker";

type MockPort = {
  postMessage: (data: unknown) => void;
  addEventListener: (
    type: "message",
    handler: (event: MessageEvent) => void | Promise<void>,
  ) => void;
  start: () => void;
  emit: (data: unknown) => Promise<void>;
  messages: unknown[];
};

function createMockPort(): MockPort {
  const messages: unknown[] = [];
  const listeners: ((event: MessageEvent) => void | Promise<void>)[] = [];

  return {
    postMessage(data: unknown) {
      messages.push(data);
    },
    addEventListener(_: "message", handler: (event: MessageEvent) => void | Promise<void>) {
      listeners.push(handler);
    },
    start() {},
    async emit(data: unknown) {
      const event = new MessageEvent("message", { data });
      await Promise.all(listeners.map((handler) => handler(event)));
    },
    messages,
  };
}

describe("shared-refresh-worker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("single port: successful refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const port = createMockPort();
    initPort(port as unknown as MessagePort);

    await port.emit({ type: "refresh", serverUrl: "https://server.example" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(port.messages).toContainEqual({
      type: "refreshed",
      serverUrl: "https://server.example",
    });
  });

  it("single port: failed refresh for non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const port = createMockPort();
    initPort(port as unknown as MessagePort);

    await port.emit({ type: "refresh", serverUrl: "https://server.example" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(port.messages).toContainEqual({
      type: "refresh_failed",
      serverUrl: "https://server.example",
    });
  });

  it("single port: failed refresh when fetch throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const port = createMockPort();
    initPort(port as unknown as MessagePort);

    await port.emit({ type: "refresh", serverUrl: "https://server.example" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(port.messages).toContainEqual({
      type: "refresh_failed",
      serverUrl: "https://server.example",
    });
  });

  it("deduplicates concurrent refresh requests for same serverUrl", async () => {
    let resolveFetch: ((value: { ok: boolean }) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const portA = createMockPort();
    const portB = createMockPort();
    initPort(portA as unknown as MessagePort);
    initPort(portB as unknown as MessagePort);

    const requestA = portA.emit({
      type: "refresh",
      serverUrl: "https://server.example",
    });
    const requestB = portB.emit({
      type: "refresh",
      serverUrl: "https://server.example",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch?.({ ok: true });
    await Promise.all([requestA, requestB]);

    expect(portA.messages).toContainEqual({
      type: "refreshed",
      serverUrl: "https://server.example",
    });
    expect(portB.messages).toContainEqual({
      type: "refreshed",
      serverUrl: "https://server.example",
    });
  });

  it("isolates concurrent requests by serverUrl", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const portA = createMockPort();
    const portB = createMockPort();
    initPort(portA as unknown as MessagePort);
    initPort(portB as unknown as MessagePort);

    await Promise.all([
      portA.emit({ type: "refresh", serverUrl: "https://server-a.example" }),
      portB.emit({ type: "refresh", serverUrl: "https://server-b.example" }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(portA.messages).toContainEqual({
      type: "refreshed",
      serverUrl: "https://server-a.example",
    });
    expect(portB.messages).toContainEqual({
      type: "refresh_failed",
      serverUrl: "https://server-b.example",
    });
  });

  it("ignores invalid message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const port = createMockPort();
    initPort(port as unknown as MessagePort);

    await port.emit({ type: "unknown" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(port.messages).toHaveLength(0);
  });

  it("doRefresh times out after 20 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const refreshPromise = doRefresh("https://server.example");
    await vi.advanceTimersByTimeAsync(20_000);

    await expect(refreshPromise).resolves.toBe(false);
  });
});
