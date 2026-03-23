import { httpClient } from "@/src/api/http-client";
import { SESSION_API_PATHS } from "@contracts/session";
import type { SigninDto } from "@contracts/session";

export type SessionUser = {
  id: string;
  login: string;
  fullname: string;
  createdAt: string;
  updatedAt: string;
};

export async function signin(input: SigninDto): Promise<SessionUser> {
  const response = await httpClient.post<SessionUser>(SESSION_API_PATHS.signin, input);
  return response.data;
}

export async function signout(): Promise<{ ok: true }> {
  const response = await httpClient.post<{ ok: true }>(SESSION_API_PATHS.signout);
  return response.data;
}

export async function check(): Promise<SessionUser | null> {
  const response = await httpClient.get<SessionUser | null>(SESSION_API_PATHS.check);
  return response.data;
}
