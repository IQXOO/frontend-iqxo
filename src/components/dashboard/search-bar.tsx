"use client"

import { X } from "lucide-react"
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true">
          <path d="m21 21-4.34-4.34"></path>
          <circle cx="11" cy="11" r="8"></circle>
        </svg>
        <input
          id="app-search-input"
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
