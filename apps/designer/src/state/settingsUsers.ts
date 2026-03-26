export type SettingsUserRole = "ADMIN" | "USER" | "ROOT";

const PASSWORD_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function normalizeRole(role: string): SettingsUserRole | null {
  const normalized = role.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "USER" || normalized === "ROOT") {
    return normalized;
  }
  return null;
}

export function resolveUserEditability(
  currentRoleRaw: string,
  targetRoleRaw: string,
): { canEdit: boolean; canChangeRole: boolean } {
  const currentRole = normalizeRole(currentRoleRaw);
  const targetRole = normalizeRole(targetRoleRaw);

  if (!currentRole || !targetRole) {
    return { canEdit: false, canChangeRole: false };
  }

  if (currentRole !== "ADMIN" && currentRole !== "ROOT") {
    return { canEdit: false, canChangeRole: false };
  }

  if (targetRole === "ROOT") {
    if (currentRole === "ROOT") {
      return { canEdit: true, canChangeRole: false };
    }
    return { canEdit: false, canChangeRole: false };
  }

  return { canEdit: true, canChangeRole: true };
}

export function generateUserPassword(length = 12): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const random = Math.floor(Math.random() * PASSWORD_ALPHABET.length);
    result += PASSWORD_ALPHABET[random];
  }
  return result;
}
