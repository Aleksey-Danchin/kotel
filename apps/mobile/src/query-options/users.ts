import { queryOptions } from "@tanstack/react-query";

import { getUsers } from "@/src/api/users";

export function usersQueryOptions(serverUrl: string) {
  return queryOptions({
    queryKey: ["users", serverUrl],
    queryFn: () => getUsers(serverUrl),
  });
}
