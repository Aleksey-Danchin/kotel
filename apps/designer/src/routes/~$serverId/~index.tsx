import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$serverId/")({
  component: ServerShellPage,
});

function ServerShellPage() {
  return null;
}
