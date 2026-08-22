"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Clock, MapPin, AlertTriangle } from "lucide-react"
import { useApp } from "../../lib/store"
import { supabase } from "../../lib/supabase"
import type { IQXOEvent } from "../../lib/types"
import { isEventOnDate } from "../../lib/recurrence"

interface MonthlyCalendarViewProps {
  onEventClick: (event: IQXOEvent) => void
}


function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function MonthlyCalendarView({ onEventClick }: MonthlyCalendarViewProps) {
  const { user, language, t, events, loading } = useApp()
  const isRTL = language === "ar"

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Calendar Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sunday

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day))
  }

  // Selected Day Agenda
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
  
  const dailyEvents = useMemo(() => {
    const todays = events.filter(e => isEventOnDate(e, selectedDateStr))
    // Sort by start time
    return todays.sort((a, b) => timeToMinutes(a.start_time || a.time) - timeToMinutes(b.start_time || b.time))
  }, [events, selectedDateStr])

  // Check conflicts
  const conflicts = useMemo(() => {
    const overlapping = new Set<string>()
    for (let i = 0; i < dailyEvents.length; i++) {
      for (let j = i + 1; j < dailyEvents.length; j++) {
        const e1 = dailyEvents[i]
        const e2 = dailyEvents[j]
        const s1 = timeToMinutes(e1.start_time || e1.time)
        const e1End = timeToMinutes(e1.end_time || e1.time) || s1 + 60 // Assume 1hr if no end
        const s2 = timeToMinutes(e2.start_time || e2.time)
        const e2End = timeToMinutes(e2.end_time || e2.time) || s2 + 60
        
        if (s1 < e2End && s2 < e1End) {
          overlapping.add(e1.id)
          overlapping.add(e2.id)
        }
      }
    }
    return overlapping
  }, [dailyEvents])

  // Timeline Math
  const timelineHours = useMemo(() => {
    let minHour = 8;
    let maxHour = 22;
    
    dailyEvents.forEach(e => {
      const timeStr = e.start_time || e.time;
      if (timeStr) {
        const h = parseInt(timeStr.split(":")[0], 10);
        if (!isNaN(h)) {
          if (h < minHour) minHour = h;
          if (h > maxHour) maxHour = h;
        }
      }
    });

    const hours = [];
    for (let h = minHour; h <= maxHour; h++) {
      const eventsInHour = dailyEvents.filter(e => {
        const timeStr = e.start_time || e.time;
        if (timeStr) {
          return parseInt(timeStr.split(":")[0], 10) === h;
        }
        return false;
      });
      hours.push({ hour: h, events: eventsInHour });
    }
    
    return hours;
  }, [dailyEvents]);

  const monthNames = [
    t("January", "Janvier", "يناير"), t("February", "Février", "فبراير"), t("March", "Mars", "مارس"),
    t("April", "Avril", "أبريل"), t("May", "Mai", "مايو"), t("June", "Juin", "يونيو"),
    t("July", "Juillet", "يوليو"), t("August", "Août", "أغسطس"), t("September", "Septembre", "سبتمبر"),
    t("October", "Octobre", "أكتوبر"), t("November", "Novembre", "نوفمبر"), t("December", "Décembre", "ديسمبر")
  ]
  const weekDays = [
    t("Sun", "Dim", "أحد"), t("Mon", "Lun", "إثنين"), t("Tue", "Mar", "ثلاثاء"),
    t("Wed", "Mer", "أربعاء"), t("Thu", "Jeu", "خميس"), t("Fri", "Ven", "جمعة"), t("Sat", "Sam", "سبت")
  ]

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto relative pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <h2 className="text-xl font-bold text-foreground">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 mb-8">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear
          
          const dayEvents = events.filter(e => isEventOnDate(e, dateStr))

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`aspect-square flex flex-col items-center justify-start pt-2 rounded-2xl relative transition-all ${
                isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30"
              }`}
            >
              <span className={`text-sm ${isToday ? "font-bold text-primary" : "text-foreground"} ${isSelected ? "font-semibold" : ""}`}>
                {day}
              </span>
              
              {/* Event Dots */}
              <div className="flex flex-wrap justify-center gap-0.5 mt-1 px-1">
                {dayEvents.slice(0, 3).map((e, idx) => (
                  <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color || '#3b82f6' }} />
                ))}
                {dayEvents.length > 3 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Daily Agenda */}
      <div className="flex-1 mt-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border/50 pb-2 flex items-center justify-between">
          <span>{selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {dailyEvents.length} {t("Events", "Événements", "أحداث")}
          </span>
        </h3>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted/20 rounded-xl" />
            <div className="h-16 bg-muted/20 rounded-xl" />
          </div>
        ) : (
          <div className="relative pt-2" style={{ paddingLeft: isRTL ? '0' : '3.5rem', paddingRight: isRTL ? '3.5rem' : '0' }}>
            {/* Main Vertical Timeline Line */}
            <div className="absolute top-0 bottom-0 w-px bg-border/40" style={{ left: isRTL ? 'auto' : '3rem', right: isRTL ? '3rem' : 'auto' }} />
            
            {timelineHours.map(({ hour, events }) => {
              const hourLabel = `${String(hour).padStart(2, '0')}:00`;
              const isPastHour = currentDate.getDate() === selectedDate.getDate() && new Date().getHours() > hour;
              
              return (
                <div key={hour} className="relative min-h-[60px] border-b border-border/10 last:border-0 py-3">
                  {/* Hour Label */}
                  <div 
                    className={`absolute top-4 w-10 text-xs font-medium ${isPastHour ? "text-muted-foreground/40" : "text-muted-foreground"} text-right`}
                    style={{ left: isRTL ? 'auto' : '-3.5rem', right: isRTL ? '-3.5rem' : 'auto', textAlign: isRTL ? 'left' : 'right' }}
                  >
                    {hourLabel}
                  </div>
                  
                  {/* Timeline Tick */}
                  <div 
                    className="absolute top-5.5 w-2 h-px bg-border/80"
                    style={{ left: isRTL ? 'auto' : '-0.5rem', right: isRTL ? '-0.5rem' : 'auto', marginTop: '11px' }}
                  />

                  {/* Empty Slot */}
                  {events.length === 0 && (
                    <div className="pl-4 pr-4 h-full flex items-center mt-1">
                      <div className="h-10 w-full rounded-xl border border-dashed border-border/30 bg-muted/5 flex items-center justify-center opacity-50">
                        <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">{t("Empty", "Vide", "فارغ")}</span>
                      </div>
                    </div>
                  )}

                  {/* Events for this Hour */}
                  {events.length > 0 && (
                    <div className="pl-4 pr-4 space-y-2 mt-1">
                      <AnimatePresence>
                        {events.map((event) => {
                          const hasConflict = conflicts.has(event.id);
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              onClick={() => onEventClick(event)}
                              className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                                hasConflict ? "border-red-500/40 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-border/40 bg-card shadow-sm hover:shadow-md"
                              }`}
                            >
                              {/* Event Timeline Dot */}
                              <div 
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background z-10 shadow-sm"
                                style={{ 
                                  backgroundColor: event.color || '#3b82f6',
                                  left: isRTL ? 'auto' : '-1.35rem',
                                  right: isRTL ? '-1.35rem' : 'auto',
                                  transform: isRTL ? 'translate(50%, -50%)' : 'translate(-50%, -50%)'
                                }}
                              />

                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold text-sm flex items-center gap-2 truncate ${hasConflict ? 'text-red-500' : 'text-foreground'}`}>
                                    {event.title}
                                    {hasConflict && (
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                                    )}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                    {(event.start_time || event.time) && (
                                      <div className={`flex items-center gap-1 ${hasConflict ? 'text-red-500/80' : ''}`}>
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          {event.start_time || event.time} {event.end_time ? `- ${event.end_time}` : ""}
                                        </span>
                                      </div>
                                    )}
                                    {event.location && (
                                      <div className="flex items-center gap-1 truncate max-w-[120px]">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
