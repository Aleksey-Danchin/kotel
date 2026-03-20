import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
  routeTree,
  //   context: { sessionUser: null },
});
