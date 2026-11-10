export type DashboardRole = "seeker" | "recruiter" | "admin";

export function getDashboardRole(role: unknown): DashboardRole {
  return role === "recruiter" || role === "admin" ? role : "seeker";
}
