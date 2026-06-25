import type { ClubUser, Role, Song } from "@/types/domain";

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "VICE_ADMIN", "TREASURER", "TEAM_ADMIN"];

export function isAdminRole(role: Role) {
  return ADMIN_ROLES.includes(role);
}

export function canCreateAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function canChangeRole(role: Role) {
  return role === "SUPER_ADMIN";
}

export function canManageTeams(role: Role) {
  return role === "SUPER_ADMIN" || role === "VICE_ADMIN" || role === "TREASURER";
}

export function canManageUsers(role: Role) {
  return isAdminRole(role);
}

export function canApproveSchedules(role: Role) {
  return isAdminRole(role);
}

export function canCreateSurvey(user: ClubUser, song: Song) {
  return isAdminRole(user.role) || song.leaderUserId === user.id;
}

export function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: "회장",
    VICE_ADMIN: "부회장",
    TREASURER: "총무",
    TEAM_ADMIN: "팀장",
    USER: "일반",
  };
  return labels[role];
}
