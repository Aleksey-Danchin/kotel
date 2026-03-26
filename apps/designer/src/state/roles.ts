export type DesignerRole = "ADMIN" | "ROOT" | "USER";

export function normalizeDesignerRole(role: string): DesignerRole {
  const normalized = role.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "ROOT" || normalized === "USER") {
    return normalized;
  }
  return "USER";
}

export function shouldShowDesignerRoleBadge(role: string): boolean {
  return normalizeDesignerRole(role) !== "USER";
}
