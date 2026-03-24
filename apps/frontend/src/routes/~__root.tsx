import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Sidebar } from "../components/sidebar";

export const Route = createRootRoute({
  component: () => (
    <div className="flex min-h-screen bg-base-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
});
