import { useAtom } from "jotai";
import type { ReactNode } from "react";
import { sessionUserAtom } from "../state/session";
import { useQuery } from "@tanstack/react-query";
import { sessionCheckQueryOptions } from "../queryOptions/session";
import { useEffect } from "react";

export function SessionCheckMiddleware({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback?: ReactNode | (() => ReactNode);
}) {
  const [sessionUser, setSessionUser] = useAtom(sessionUserAtom);
  const enabled = sessionUser === null;
  const fallbackCallback =
    typeof fallback === "function" ? fallback : () => fallback;

  const checkQuery = useQuery({
    ...sessionCheckQueryOptions(),
    enabled,
  });

  useEffect(() => {
    if (checkQuery.data) {
      setSessionUser(checkQuery.data);
    }
  }, [checkQuery.data, setSessionUser]);

  const isChecked = checkQuery.isSuccess || sessionUser !== null;
  return isChecked ? children : fallbackCallback();
}
