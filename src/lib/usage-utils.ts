/**
 * Usage system utilities
 * 
 * Conversion math:
 * - Budget limit: $4.00 per user per month
 * - Total actions: 1000 smart actions
 * - Cost per action: $4.00 / 1000 = $0.004
 * 
 * Usage format: USD spent (number)
 * Calculation: actions_remaining = (4 - totalUsage) / 0.004
 */

export const USAGE_CONFIG = {
  BUDGET_LIMIT_USD: 4.0,
  MAX_ACTIONS: 1000,
  COST_PER_ACTION: 0.004,
  WARNING_THRESHOLD_ACTIONS: 200, // warn user when < 200 actions remain
};

/**
 * Convert USD spent to remaining smart actions
 */
export function getActionsRemaining(totalUsageUSD: number): number {
  const remaining = (USAGE_CONFIG.BUDGET_LIMIT_USD - totalUsageUSD) / USAGE_CONFIG.COST_PER_ACTION;
  return Math.max(0, Math.floor(remaining));
}

/**
 * Get usage percentage (0-100)
 */
export function getUsagePercentage(totalUsageUSD: number): number {
  const percentage = (totalUsageUSD / USAGE_CONFIG.BUDGET_LIMIT_USD) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Check if user is near limit (should show warning)
 */
export function isNearLimit(totalUsageUSD: number): boolean {
  const remaining = getActionsRemaining(totalUsageUSD);
  return remaining < USAGE_CONFIG.WARNING_THRESHOLD_ACTIONS;
}

/**
 * Check if user exceeded limit
 */
export function isLimitExceeded(totalUsageUSD: number): boolean {
  return totalUsageUSD >= USAGE_CONFIG.BUDGET_LIMIT_USD;
}

/**
 * Format usage display string
 * Example: "742 / 1000 Smart Actions Remaining"
 */
export function formatUsageDisplay(totalUsageUSD: number): string {
  const remaining = getActionsRemaining(totalUsageUSD);
  return `${remaining} / ${USAGE_CONFIG.MAX_ACTIONS} Smart Actions Remaining`;
}

/**
 * Convert USD cost to approximate actions consumed
 */
export function usdToActions(usd: number): number {
  return Math.round(usd / USAGE_CONFIG.COST_PER_ACTION);
}

/**
 * Get usage status color for UI
 */
export function getUsageStatusColor(totalUsageUSD: number): "green" | "amber" | "red" {
  if (isLimitExceeded(totalUsageUSD)) return "red";
  if (isNearLimit(totalUsageUSD)) return "amber";
  return "green";
}

/**
 * Get usage status text
 */
export function getUsageStatusText(
  totalUsageUSD: number,
  language: "en" | "fr" | "ar" = "en"
): string {
  const remaining = getActionsRemaining(totalUsageUSD);
  
  if (isLimitExceeded(totalUsageUSD)) {
    const texts = {
      en: "Limit Exceeded",
      fr: "Limite Dépassée",
      ar: "تم تجاوز الحد",
    };
    return texts[language];
  }
  
  if (isNearLimit(totalUsageUSD)) {
    const texts = {
      en: `Only ${remaining} actions left`,
      fr: `${remaining} actions restantes`,
      ar: `${remaining} إجراء متبقي`,
    };
    return texts[language];
  }
  
  return "";
}
