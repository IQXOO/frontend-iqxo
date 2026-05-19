"use client"

import { motion } from "framer-motion"
import { BellRing, Sparkles } from "lucide-react"

interface NotificationEmptyStateProps {
  title: string
  description: string
}

export function NotificationEmptyState({ title, description }: NotificationEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl border border-border/70 bg-gradient-to-br from-blue-500/5 to-transparent p-6 text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <BellRing className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span>IQXO keeps watch so you can stay focused.</span>
      </div>
    </motion.div>
  )
}
