import { getServerClient } from "@/src/api/create-server-client";

export type UserRow = {
  id: string;
  fullname: string;
  createdAt: string;
  updatedAt: string;
};

export async function getUsers(serverUrl: string): Promise<UserRow[]> {
  const response =
    await getServerClient(serverUrl).get<UserRow[]>("/api/users");
  return response.data;
}
