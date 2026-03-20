import axios from "axios";
import { axiosLimitter } from "./axiosLimitter";

export interface UserRow {
  id: string;
  fullname: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUsers(): Promise<UserRow[]> {
  return axiosLimitter(async () => {
    const response = await axios.get<UserRow[]>("/api/users");
    return response.data;
  });
}
