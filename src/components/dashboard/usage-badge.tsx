import { useApp } from "@/lib/store";
import { 
  formatUsageDisplay, 
  getUsagePercentage, 
  isLimitExceeded, 
  isNearLimit,
  getUsageStatusColor,
  getUsageStatusText,
} from "@/lib/usage-utils";
import { motion } from "framer-motion";
import { AlertCircle, Zap } from "lucide-react";

interface UsageBadgeProps {
  showWarning?: boolean;
  compact?: boolean;
}

export function UsageBadge({ showWarning = true, compact = false }: UsageBadgeProps) {
  const { totalUsage, usageLoading, language } = useApp();

  if (usageLoading) {
    return (
      <div className="h-10 w-full max-w-sm rounded-lg bg-secondary/30 animate-pulse" />
    );
  }

  const percentage = getUsagePercentage(totalUsage);
  const isExceeded = isLimitExceeded(totalUsage);
  const isNear = isNearLimit(totalUsage);
  const statusColor = getUsageStatusColor(totalUsage);
  const statusText = getUsageStatusText(totalUsage, language as any);
  const displayText = formatUsageDisplay(totalUsage);

  const colorClasses = {
    green: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
      text: "text-emerald-400",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      bar: "bg-amber-500",
      text: "text-amber-400",
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      bar: "bg-red-500",
      text: "text-red-400",
    },
  };

  const colors = colorClasses[statusColor];

  if (compact) {
    return (
      <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
        <div className="flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${colors.text}`} />
          <span className={`text-xs font-semibold ${colors.text}`}>
            {displayText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3.5 rounded-xl ${colors.bg} border ${colors.border}`}
    >
      {/* Header with title and percentage */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${colors.text}`} />
          <span className="text-sm font-semibold text-white">
            Smart Actions
          </span>
        </div>
        <span className={`text-xs font-bold ${colors.text}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full ${colors.bar}`}
        />
      </div>

      {/* Display text */}
      <p className="text-xs text-white/70 mb-2">{displayText}</p>

      {/* Warning or status message */}
      {showWarning && statusText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-start gap-2 pt-2 border-t border-white/5"
        >
          <AlertCircle className={`w-3.5 h-3.5 ${colors.text} shrink-0 mt-0.5`} />
          <span className={`text-[11px] ${colors.text}`}>{statusText}</span>
        </motion.div>
      )}

      {/* Limit exceeded state */}
      {isExceeded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 pt-2 border-t border-red-500/20"
        >
          <p className="text-[11px] text-red-400 font-semibold">
            {language === "ar"
              ? "تم تجاوز الحد الأقصى. يرجى الترقية."
              : language === "fr"
                ? "Limite dépassée. Veuillez vous abonner."
                : "Limit exceeded. Please upgrade."}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
