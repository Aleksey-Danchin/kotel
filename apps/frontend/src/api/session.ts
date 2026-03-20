import axios from "axios";
import { SESSION_API_PATHS } from "@contracts/session";
import type { SigninDto } from "@contracts/session";
import { axiosLimitter } from "../global/axiosLimitter";

export interface SessionUser {
  id: string;
  login: string;
  fullname: string;
  createdAt: string;
  updatedAt: string;
}

export async function signin(input: SigninDto): Promise<SessionUser> {
  return axiosLimitter(async () => {
    const response = await axios.post<SessionUser>(
      SESSION_API_PATHS.signin,
      input,
    );
    return response.data;
  });
}

export async function signout(): Promise<{ ok: true }> {
  return axiosLimitter(async () => {
    const response = await axios.post<{ ok: true }>(SESSION_API_PATHS.signout);
    return response.data;
  });
}

export async function check(): Promise<SessionUser | null> {
  return axiosLimitter(async () => {
    const response = await axios.get<SessionUser | null>(
      SESSION_API_PATHS.check,
    );
    return response.data;
  });
}
