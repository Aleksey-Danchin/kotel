import { httpClient } from "@/src/api/http-client";

export type UserRow = {
  id: string;
  fullname: string;
  createdAt: string;
  updatedAt: string;
};

export async function getUsers(): Promise<UserRow[]> {
  const response = await httpClient.get<UserRow[]>("/api/users");
  return response.data;
}
