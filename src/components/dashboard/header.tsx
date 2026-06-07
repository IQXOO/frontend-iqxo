"use client"

import { Suspense } from "react"
import { Moon, Sun, Languages } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useApp } from "../../lib/store"
import { motion } from "framer-motion"
import { BrandLogo } from "../brand-logo"
import { lazyNamed } from "../../lib/lazy"

const NotificationBell = lazyNamed(() => import("./notification-bell"), "NotificationBell")

interface DashboardHeaderProps {
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onSearchClick?: () => void
  activeTab?: string
}

export function DashboardHeader({ 
  onProfileClick, 
  onSettingsClick,
  onSearchClick,
  activeTab = "home"
}: DashboardHeaderProps) {
  const { user, theme, toggleTheme, language, toggleLanguage, t } = useApp()

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || 
    user?.email?.split("@")[0] || 
    "User"

  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex flex-col">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground font-geometric">
          <BrandLogo className="text-2xl font-bold tracking-tight font-geometric" />
        </h1>
      </div>
      
      {/* Header Controls */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        <motion.button
          onClick={onSearchClick}
          className={`glass rounded-xl p-2.5 transition-all duration-200 ${
            activeTab === "home" ? "bg-primary/20" : "hover:bg-secondary/50"
          } active:scale-95`}
          aria-label="Search"
          whileTap={{ scale: 0.95 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${activeTab === "home" ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true">
            <path d="m21 21-4.34-4.34"></path>
            <circle cx="11" cy="11" r="8"></circle>
          </svg>
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

        <Suspense fallback={<div className="glass rounded-xl p-2.5 h-10 w-10" />}>
          <NotificationBell />
        </Suspense>

      
        {/* Profile Avatar - Clickable */}
        <motion.button
          onClick={onProfileClick || onSettingsClick}
          className="relative group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer transition-all group-hover:ring-primary/60">
            <AvatarImage
              src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${firstName}`}
              alt="User avatar"
            />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>
    </header>
  )
}
