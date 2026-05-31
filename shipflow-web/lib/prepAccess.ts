import type { Usuario } from "@/lib/types";

export const PREP_BETA_EMAIL = "131studio.ec@gmail.com";
export const PREP_UNAVAILABLE_MESSAGE = "SendiFlash Prep is not available for your account yet.";

type PrepAccessUser =
  | Pick<Usuario, "email" | "role">
  | {
      email?: string | null;
      role?: string | null;
    }
  | null
  | undefined;

export function normalizePrepAccessEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function canUsePrepBetaEmail(email?: string | null) {
  return normalizePrepAccessEmail(email) === PREP_BETA_EMAIL;
}

export function canUsePrepBeta(user: PrepAccessUser) {
  return canUsePrepBetaEmail(user?.email) || user?.role === "admin";
}

export function getPrepAccessState(user: PrepAccessUser) {
  const isAllowedEmail = canUsePrepBetaEmail(user?.email);
  const isAdminPreview = user?.role === "admin";
  const canUsePrep = isAllowedEmail || isAdminPreview;

  return {
    canUsePrep,
    isAdminPreview,
    isAllowedEmail,
    label: canUsePrep ? "Prep beta enabled" : "Prep in preparation",
    reason: canUsePrep ? "allowed" : "prep_beta_closed",
  };
}
