import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/config/")({
  component: ConfigIndexPage,
});

function ConfigIndexPage() {
  return null;
}
