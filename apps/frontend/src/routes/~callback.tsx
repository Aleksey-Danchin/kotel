import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const postedRef = useRef(false);

  useEffect(() => {
    if (postedRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && state && window.opener) {
      postedRef.current = true;
      window.opener.postMessage({ code, state }, window.location.origin);
      window.close();
    }
  }, []);

  return <p>Processing authentication...</p>;
}
