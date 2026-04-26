"use client"

export function useRelativeTime(date: string, time: string) {
  const eventDateTime = new Date(`${date}T${time}`)
  const now = new Date()
  const diffMs = eventDateTime.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMs < 0) return { text: "Expired", color: "text-red-500" }
  if (diffMins < 1) return { text: "Now", color: "text-red-500" }
  if (diffMins < 60) return { text: `In ${diffMins}m`, color: "text-orange-500" }
  if (diffHours < 24) return { text: `In ${diffHours}h`, color: "text-amber-500" }
  if (diffDays < 7) return { text: `In ${diffDays}d`, color: "text-yellow-500" }
  return { text: `In ${Math.floor(diffDays / 7)}w`, color: "text-green-500" }
}

interface SmartTimeProps {
  date: string
  time: string
  className?: string
}

export function SmartTime({ date, time, className = "" }: SmartTimeProps) {
  const relativeTime = useRelativeTime(date, time)
  
  return (
    <span className={`${relativeTime.color} font-semibold text-sm ${className}`}>
      {relativeTime.text}
    </span>
  )
}
