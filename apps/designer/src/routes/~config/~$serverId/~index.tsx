import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/config/$serverId/")({
  component: ConfigServerPage,
});

function ConfigServerPage() {
  return null;
}
