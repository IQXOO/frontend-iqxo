export type BillingPlanStatus = "free_trial" | "pro" | "expired" | "none";

export function normalizeBillingPlanStatus(rawStatus: unknown): BillingPlanStatus {
  const value = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : "";

  if (value === "pro") return "pro";
  if (value === "free_trial" || value === "trial") return "free_trial";
  if (value === "expired") return "expired";

  return "none";
}

export function shouldShowBillingPopup(
  planResolved: boolean,
  planStatus: unknown,
): boolean {
  return planResolved && normalizeBillingPlanStatus(planStatus) !== "pro";
}

export function shouldForceBillingPopup(planStatus: unknown): boolean {
  const normalized = normalizeBillingPlanStatus(planStatus);
  return normalized === "none" || normalized === "expired";
}

export function shouldAutoOpenBillingRoute(
  planResolved: boolean,
  planStatus: unknown,
  trialEndsAt?: Date | string | null,
): boolean {
  if (!planResolved) return false;

  const normalized = normalizeBillingPlanStatus(planStatus);
  if (normalized === "pro") return false;

  if (normalized !== "free_trial") return true;

  if (!trialEndsAt) return false;

  const trialEndDate = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(trialEndDate.getTime())) return false;

  return trialEndDate <= new Date();
}
