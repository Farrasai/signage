import type { Bidang, Profile, Role } from "./types";

export const ADMIN_ROLES: Role[] = ["admin"];

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

export function isOperator(profile: Profile | null | undefined): boolean {
  return profile?.role === "operator_bidang";
}

export function canEditDisplay(profile: Profile | null, display: { owner_id: string | null; bidang: string | null }): boolean {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  if (display.owner_id && display.owner_id === profile.id) return true;
  if (display.bidang && profile.bidang && display.bidang === profile.bidang) return true;
  // data lama owner_id null dianggap milik admin, operator tidak boleh edit
  return false;
}

export function canEditOwner(profile: Profile | null, ownerId: string | null): boolean {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  return ownerId === profile.id;
}

export function canAccessAnnouncer(profile: Profile | null | undefined): boolean {
  return isAdmin(profile);
}

export function canAccessEmergency(profile: Profile | null | undefined): boolean {
  return isAdmin(profile);
}

export function canAccessUsers(profile: Profile | null | undefined): boolean {
  return isAdmin(profile);
}

export const BIDANG_LABEL: Record<string, string> = {
  TU: "TU",
  INTEL: "INTEL",
  BIN: "BIN",
  PIDSUS: "PIDSUS",
  PIDUM: "PIDUM",
  DATUN: "DATUN",
  PAPBB: "PAPBB",
};

export function bidangLabel(bidang: Bidang | string | null): string {
  if (!bidang) return "-";
  return BIDANG_LABEL[bidang] ?? bidang;
}
