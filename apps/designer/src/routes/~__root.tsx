import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Sidebar } from "../components/sidebar";
import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { serversAtom, serversStore, setServerSession } from "../state/servers";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  const serversMap = useAtomValue(serversAtom, { store: serversStore });

  useEffect(() => {
    if (serversMap.size !== 0) {
      return;
    }

    // Моки данных для песочницы: только внутри тела компонента.
    const defaults = [
      {
        serverUrl: "https://kotel.localhost",
        user: {
          id: "mock-user-1",
          fullname: "Mock User",
          login: "mock",
          role: "admin",
        },
      },
    ];

    defaults.forEach((s) => setServerSession(s));
  }, [serversMap.size]);

  return (
    <div className="flex min-h-screen bg-base-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  );
}
