"use client"

import { useState, useEffect } from "react"
import { Search, Lightbulb, Plus, Palette, Download, LogOut } from "lucide-react"
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
  const { events } = useApp()
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
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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

  const commands = [
    {
      id: "add-event",
      label: "Add New Event",
      description: "Create a new task or event",
      icon: Plus,
      action: () => {
        onAddEvent()
        setOpen(false)
      },
    },
    {
      id: "dark-mode",
      label: "Toggle Dark Mode",
      description: "Switch between light and dark theme",
      icon: Palette,
      action: () => {
        onToggleDarkMode()
        setOpen(false)
      },
    },
    {
      id: "export",
      label: "Export to PDF",
      description: "Download your records as PDF",
      icon: Download,
      action: () => {
        onExportPDF()
        setOpen(false)
      },
    },
    {
      id: "logout",
      label: "Sign Out",
      description: "Log out from your account",
      icon: LogOut,
      action: () => {
        onLogout()
        setOpen(false)
      },
    },
  ]

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  // Filter events by search
  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.notes?.toLowerCase().includes(search.toLowerCase()) ||
      event.location?.toLowerCase().includes(search.toLowerCase())
  )

  const allItems = [
    ...filteredEvents.map((event) => ({ type: "event" as const, item: event })),
    ...filteredCommands.map((cmd) => ({ type: "command" as const, item: cmd })),
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
      if (!open) return

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
    <>
      {/* Command Palette Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
            >
              <div className="rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Find events, commands..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setSelectedIndex(0)
                    }}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-secondary text-xs text-muted-foreground">
                    <span>ESC</span>
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                  {allItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Lightbulb className="w-8 h-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No results found</p>
                    </div>
                  ) : (
                    allItems.map((item, index) => {
                      const isSelected = index === selectedIndex
                      const isEvent = item.type === "event"

                      return (
                        <motion.button
                          key={isEvent ? (item.item as IQXOEvent).id : (item.item as (typeof commands)[0]).id}
                          onClick={() => handleSelect(item)}
                          className={`w-full px-6 py-3 flex items-start gap-4 transition-colors ${
                            isSelected ? "bg-primary/20" : "hover:bg-secondary/50"
                          }`}
                        >
                          {isEvent ? (
                            <>
                              <Lightbulb className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                              <div className="flex-1 text-left">
                                <p className="font-medium text-foreground">
                                  {(item.item as IQXOEvent).title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(item.item as IQXOEvent).date} at{" "}
                                  {(item.item as IQXOEvent).time || "TBD"}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              {(() => {
                                const IconComp = (item.item as (typeof commands)[0]).icon
                                if (!IconComp) return null
                                return <IconComp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                              })()}
                              <div className="flex-1 text-left">
                                <p className="font-medium text-foreground">
                                  {(item.item as (typeof commands)[0]).label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(item.item as (typeof commands)[0]).description}
                                </p>
                              </div>
                            </>
                          )}
                        </motion.button>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-secondary/30 text-xs text-muted-foreground">
                  <div className="flex gap-4">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                  </div>
                  <span>ESC to close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
