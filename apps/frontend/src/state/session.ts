import { atom } from "jotai";
import type { SessionUser } from "../api/session";

export const sessionUserAtom = atom<SessionUser | null>(null);
export const sessionErrorAtom = atom<string | null>(null);
