import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(index)/")({
  component: IndexPage,
});

function IndexPage() {
  return null;
}
