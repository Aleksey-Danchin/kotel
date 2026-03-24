import { getServerClient } from "@/src/api/create-server-client";

export type MobileSessionStatusResponse = {
  sessionId: string;
  user: {
    id: string;
    fullname: string;
    login?: string;
    role: string;
  };
};

export async function getMobileSessionStatus(
  serverUrl: string,
): Promise<MobileSessionStatusResponse> {
  const response = await getServerClient(serverUrl).get<MobileSessionStatusResponse>(
    "/api/session/status",
  );
  return response.data;
}

export async function forceMobileSessionRefresh(
  serverUrl: string,
): Promise<void> {
  await getServerClient(serverUrl).post("/api/session/refresh");
}

export async function logoutMobileSession(
  serverUrl: string,
  allDevices = false,
): Promise<void> {
  await getServerClient(serverUrl).post("/api/session/logout", { allDevices });
}
