import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./global/router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./global/queryClient";
import { getRoot } from "./global/getRoot";
import "./index.css";
import { SessionCheckMiddleware } from "./middleware/sessionCheckMiddleware";

createRoot(getRoot()).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionCheckMiddleware>
        <RouterProvider router={router} />
      </SessionCheckMiddleware>
    </QueryClientProvider>
  </StrictMode>,
);
