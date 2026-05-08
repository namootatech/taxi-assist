export const PARTNER_ROLES = ["owner", "admin", "operator", "viewer"] as const

export type PartnerRole = (typeof PARTNER_ROLES)[number]

export function isPartnerRole(value: unknown): value is PartnerRole {
  return typeof value === "string" && (PARTNER_ROLES as readonly string[]).includes(value)
}

export function canInviteMembers(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin"
}

export function canRemoveMembers(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin"
}

export function canChangeMemberRole(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin"
}

export function canEditOrg(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin"
}

export function canCloseOrg(role: PartnerRole | string | null | undefined) {
  return role === "owner"
}

export function canManageBilling(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin"
}

export function canManageCreatives(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin" || role === "operator"
}

export function canManageCampaigns(role: PartnerRole | string | null | undefined) {
  return role === "owner" || role === "admin" || role === "operator"
}

export function isViewer(role: PartnerRole | string | null | undefined) {
  return role === "viewer"
}

export function roleLabel(role: PartnerRole | string | null | undefined) {
  if (!role) return "Member"
  return role.charAt(0).toUpperCase() + role.slice(1)
}
