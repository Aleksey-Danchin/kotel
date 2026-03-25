import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ServicesColumn } from "./ServicesColumn";
import { ChatsColumn } from "./ChatsColumn";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-base-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <div className="w-70 shrink-0 self-stretch">
          <ServicesColumn />
        </div>

        <div className="w-70 shrink-0 self-stretch">
          <ChatsColumn />
        </div>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col p-6">
          <Outlet />
        </main>

        <TanStackRouterDevtools />
      </div>
    </div>
  );
}
