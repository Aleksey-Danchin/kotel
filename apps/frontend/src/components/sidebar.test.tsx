import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "./sidebar";
import { resetServersStore, setServerSession, setActiveServer } from "../state/servers";

vi.mock("../api/auth", () => ({
  addServer: vi.fn(),
  removeServer: vi.fn(),
}));

describe("sidebar", () => {
  beforeEach(() => {
    resetServersStore();
  });

  it("shows empty state when no servers connected", () => {
    const html = renderToStaticMarkup(<Sidebar />);
    expect(html).toContain("Нет подключенных серверов");
    expect(html).toContain("Добавить сервер");
  });

  it("renders connected servers with host, user name and role badge", () => {
    setServerSession({
      serverUrl: "https://kotel.localhost",
      sessionId: "sess-1",
      user: {
        id: "user-1",
        fullname: "Иван Петров",
        login: "ivan",
        role: "admin",
      },
    });

    const html = renderToStaticMarkup(<Sidebar />);
    expect(html).toContain("kotel.localhost");
    expect(html).toContain("Иван Петров");
    expect(html).toContain("ADMIN");
  });

  it("highlights active server", () => {
    setServerSession({
      serverUrl: "https://one.localhost",
      sessionId: "sess-1",
      user: {
        id: "user-1",
        fullname: "User One",
        login: "one",
        role: "user",
      },
    });
    setServerSession({
      serverUrl: "https://two.localhost",
      sessionId: "sess-2",
      user: {
        id: "user-2",
        fullname: "User Two",
        login: "two",
        role: "root",
      },
    });
    setActiveServer("https://two.localhost");

    const html = renderToStaticMarkup(<Sidebar />);
    expect(html).toContain("two.localhost");
    expect(html).toContain("bg-primary/15");
  });
});
