import axios, { AxiosHeaders } from "axios";

import { apiConfig } from "@/src/config/api-config";

export const httpClient = axios.create({
  baseURL: apiConfig.baseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((requestConfig) => {
  const headers = AxiosHeaders.from(requestConfig.headers);
  headers.set("Host", apiConfig.hostHeader);
  requestConfig.headers = headers;
  return requestConfig;
});
