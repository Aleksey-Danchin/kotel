import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && state && window.opener) {
      window.opener.postMessage({ code, state }, window.location.origin);
      window.close();
    }
  }, []);

  return <p>Processing authentication...</p>;
}
