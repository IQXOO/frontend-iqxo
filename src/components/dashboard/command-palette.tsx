"use client"

import { useState, useEffect } from "react"
import { Search, Lightbulb, Plus, Palette, Download, LogOut, X, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useApp } from "@/lib/store"
import type { IQXOEvent } from "@/lib/types"

interface CommandPaletteProps {
  onAddEvent: () => void
  onToggleDarkMode: () => void
  onExportPDF: () => void
  onLogout: () => void
  onEventSelect: (event: IQXOEvent) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({
  onAddEvent,
  onToggleDarkMode,
  onExportPDF,
  onLogout,
  onEventSelect,
  isOpen: isOpenProp,
  onOpenChange,
}: CommandPaletteProps) {
  const { events, language } = useApp()
  const [openLocal, setOpenLocal] = useState(false)
  const isControlled = typeof isOpenProp === "boolean"
  const open = isControlled ? isOpenProp! : openLocal
  const setOpen = (v: boolean) => {
    if (isControlled) {
      onOpenChange?.(v)
    } else {
      setOpenLocal(v)
    }
  }
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(!open)
        setSearch("")
        setSelectedIndex(0)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const t = {
    placeholder:
      language === "ar"
        ? "ابحث عن أحداث أو أوامر..."
        : language === "fr"
        ? "Rechercher événements, commandes..."
        : "Find events, commands...",
    addEvent: language === "ar" ? "إضافة حدث جديد" : "Add New Event",
    addEventDesc: language === "ar" ? "إنشاء موعد أو مهمة جديدة" : "Create a new task or event",
    darkMode: language === "ar" ? "تبديل المظهر" : "Toggle Dark Mode",
    darkModeDesc: language === "ar" ? "التبديل بين الوضع الليلي والنهاري" : "Switch between light and dark theme",
    export: language === "ar" ? "تصدير كملف PDF" : "Export to PDF",
    exportDesc: language === "ar" ? "تنزيل سجل المواعيد بصيغة PDF" : "Download your records as PDF",
    logout: language === "ar" ? "تسجيل الخروج" : "Sign Out",
    logoutDesc: language === "ar" ? "تسجيل الخروج من حسابك" : "Log out from your account",
    noResults: language === "ar" ? "لا توجد نتائج مطابقة" : "No results found",
    navigate: language === "ar" ? "↑↓ للتنقل" : "↑↓ Navigate",
    select: language === "ar" ? "↵ للاختيار" : "↵ Select",
    esc: language === "ar" ? "ESC للإغلاق" : "ESC to close",
  }

  const commands = [
    {
      id: "add-event",
      label: t.addEvent,
      description: t.addEventDesc,
      icon: Plus,
      action: () => {
        onAddEvent()
        setOpen(false)
      },
    },
    {
      id: "dark-mode",
      label: t.darkMode,
      description: t.darkModeDesc,
      icon: Palette,
      action: () => {
        onToggleDarkMode()
        setOpen(false)
      },
    },
    {
      id: "export",
      label: t.export,
      description: t.exportDesc,
      icon: Download,
      action: () => {
        onExportPDF()
        setOpen(false)
      },
    },
    {
      id: "logout",
      label: t.logout,
      description: t.logoutDesc,
      icon: LogOut,
      action: () => {
        onLogout()
        setOpen(false)
      },
    },
  ]

  const cleanSearch = search.trim().toLowerCase()

  const filteredCommands = commands.filter(
    (cmd) =>
      !cleanSearch ||
      cmd.label.toLowerCase().includes(cleanSearch) ||
      cmd.description.toLowerCase().includes(cleanSearch)
  )

  // Filter events by search
  const filteredEvents = cleanSearch
    ? events.filter(
        (event) =>
          event.title.toLowerCase().includes(cleanSearch) ||
          event.notes?.toLowerCase().includes(cleanSearch) ||
          event.location?.toLowerCase().includes(cleanSearch)
      )
    : events.slice(0, 3)

  const allItems = [
    ...filteredCommands.map((cmd) => ({ type: "command" as const, item: cmd })),
    ...filteredEvents.map((event) => ({ type: "event" as const, item: event })),
  ]

  const handleSelect = (item: (typeof allItems)[0]) => {
    if (item.type === "event") {
      onEventSelect(item.item as IQXOEvent)
    } else {
      (item.item as (typeof commands)[0]).action()
    }
    setOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || allItems.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % allItems.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + allItems.length) % allItems.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (allItems[selectedIndex]) {
          handleSelect(allItems[selectedIndex])
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, allItems, selectedIndex])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-md"
          />

          {/* Palette Container (Top-anchored for mobile keyboards) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.15 }}
            className="fixed top-10 sm:top-20 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl"
          >
            <div className="rounded-2xl sm:rounded-3xl bg-background/95 backdrop-blur-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col">
              {/* Search Header Input */}
              <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border/60">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder={t.placeholder}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setSelectedIndex(0)
                  }}
                  className="flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/50 outline-none"
                />

                {/* Clear search or ESC */}
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("")
                      setSelectedIndex(0)
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground border border-border">
                    <span>ESC</span>
                  </kbd>
                )}

                {/* Mobile close button */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="sm:hidden p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results List */}
              <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto p-1.5 sm:p-2 divide-y divide-border/20">
                {allItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Lightbulb className="w-8 h-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">{t.noResults}</p>
                  </div>
                ) : (
                  allItems.map((item, index) => {
                    const isSelected = index === selectedIndex
                    const isEvent = item.type === "event"

                    return (
                      <button
                        key={
                          isEvent
                            ? `event-${(item.item as IQXOEvent).id}`
                            : `cmd-${(item.item as (typeof commands)[0]).id}`
                        }
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3.5 transition-colors cursor-pointer text-start ${
                          isSelected
                            ? "bg-[#5BC0DE]/15 text-foreground"
                            : "hover:bg-secondary/50 text-foreground"
                        }`}
                      >
                        {isEvent ? (
                          <>
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                              <Calendar className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {(item.item as IQXOEvent).title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {(item.item as IQXOEvent).date}
                                {(item.item as IQXOEvent).time && ` • ${(item.item as IQXOEvent).time}`}
                                {(item.item as IQXOEvent).location && ` • ${(item.item as IQXOEvent).location}`}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            {(() => {
                              const IconComp = (item.item as (typeof commands)[0]).icon
                              return (
                                <div className="w-9 h-9 rounded-xl bg-secondary/80 border border-border/80 flex items-center justify-center shrink-0">
                                  <IconComp className="w-4 h-4 text-[#5BC0DE]" />
                                </div>
                              )
                            })()}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {(item.item as (typeof commands)[0]).label}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {(item.item as (typeof commands)[0]).description}
                              </p>
                            </div>
                          </>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Bottom Footer Shortcuts */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-t border-border/60 bg-secondary/20 text-[11px] font-medium text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>{t.navigate}</span>
                  <span>{t.select}</span>
                </div>
                <span>{t.esc}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
