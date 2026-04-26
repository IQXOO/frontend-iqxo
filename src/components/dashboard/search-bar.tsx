"use client"

import { Search, X } from "lucide-react"
import { useApp } from "@/lib/store"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useApp()

  return (
    <div className="px-5 py-2">
      <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="shrink-0 rounded-full p-0.5 hover:bg-secondary/50 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}
