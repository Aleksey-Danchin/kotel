import { queryOptions } from "@tanstack/react-query";
import { check } from "../api/session";

export function sessionCheckQueryOptions() {
  return queryOptions({
    queryKey: ["session", "check"],
    queryFn: check,
  });
}
