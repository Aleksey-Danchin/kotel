import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$key/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { key } = Route.useParams();
  return <button className="btn btn-primary">Click me {key}</button>;
}
