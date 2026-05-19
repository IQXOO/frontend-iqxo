"use client"

import { Moon, Sun, Languages, Home, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useApp } from "../../lib/store"
import { motion } from "framer-motion"
import { NotificationBell } from "./notification-bell"

interface DashboardHeaderProps {
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onHomeClick?: () => void
  activeTab?: string
}

export function DashboardHeader({ 
  onProfileClick, 
  onSettingsClick,
  onHomeClick,
  activeTab = "home"
}: DashboardHeaderProps) {
  const { theme, toggleTheme, language, toggleLanguage, t } = useApp()

  // Build welcome message
  const welcomeMessage = t("IQXO")

  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {t("live")}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-geometric">
          {welcomeMessage}
        </h1>
      </div>
      
      {/* Header Controls */}
      <div className="flex items-center gap-2">
        {/* Home Button */}
        <motion.button
          onClick={onHomeClick}
          className={`glass rounded-xl p-2.5 transition-all duration-200 ${
            activeTab === "home" ? "bg-primary/20" : "hover:bg-secondary/50"
          } active:scale-95`}
          aria-label="Home"
          whileTap={{ scale: 0.95 }}
        >
          <Home className={`h-5 w-5 ${activeTab === "home" ? "text-primary" : "text-muted-foreground"}`} />
        </motion.button>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="glass rounded-xl px-2.5 py-2 transition-all duration-200 hover:bg-secondary/50 active:scale-95 flex items-center gap-1.5"
          aria-label="Toggle language"
        >
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground uppercase">
            {language}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="glass rounded-xl p-2.5 transition-all duration-200 hover:bg-secondary/50 active:scale-95"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <NotificationBell />

      
        {/* Profile Avatar - Clickable */}
        <motion.button
          onClick={onProfileClick || onSettingsClick}
          className="relative group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer transition-all group-hover:ring-primary/60">
            <AvatarImage
              src={`https://api.dicebear.com/9.x/notionists/svg?seed=User`}
              alt="User avatar"
            />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              U
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>
    </header>
  )
}
