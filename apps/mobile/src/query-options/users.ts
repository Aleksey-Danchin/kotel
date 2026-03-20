import { queryOptions } from "@tanstack/react-query";

import { getUsers } from "@/src/api/users";

export function usersQueryOptions() {
  return queryOptions({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}
