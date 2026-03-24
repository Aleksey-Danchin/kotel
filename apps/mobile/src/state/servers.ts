import { atom } from "jotai";

export type MobileServerUser = {
  id: string;
  fullname: string;
  role: string;
};

export type MobileServerSession = {
  serverUrl: string;
  sessionId: string;
  user: MobileServerUser;
};

export const serversAtom = atom<Map<string, MobileServerSession>>(new Map());
export const activeServerUrlAtom = atom<string | null>(null);

export const activeServerSessionAtom = atom((get) => {
  const activeServerUrl = get(activeServerUrlAtom);
  if (!activeServerUrl) {
    return null;
  }

  return get(serversAtom).get(activeServerUrl) ?? null;
});
