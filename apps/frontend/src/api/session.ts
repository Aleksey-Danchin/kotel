import axios from "axios";
import { axiosLimitter } from "../global/axiosLimitter";

export interface SessionUser {
  id: string;
  login: string;
  fullname: string;
  createdAt: string;
  updatedAt: string;
}

export interface SigninInput {
  login: string;
  password: string;
}

export async function signin(input: SigninInput): Promise<SessionUser> {
  return axiosLimitter(async () => {
    const response = await axios.post<SessionUser>("/api/session/signin", input);
    return response.data;
  });
}

export async function signout(): Promise<{ ok: true }> {
  return axiosLimitter(async () => {
    const response = await axios.post<{ ok: true }>("/api/session/signout");
    return response.data;
  });
}

export async function check(): Promise<SessionUser | null> {
  return axiosLimitter(async () => {
    const response = await axios.get<SessionUser | null>("/api/session/check");
    return response.data;
  });
}
