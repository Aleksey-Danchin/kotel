import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./global/router";
import { getRoot } from "./global/getRoot";
import "./index.css";

createRoot(getRoot()).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
