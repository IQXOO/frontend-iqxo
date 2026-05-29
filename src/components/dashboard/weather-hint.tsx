"use client"

import { useState, useEffect } from "react"
import { Cloud, Sun, CloudRain } from "lucide-react"

interface WeatherHintProps {
  location?: string
  date: string
}

export function WeatherHint({ location, date }: WeatherHintProps) {
  const [weather, setWeather] = useState<{ icon: string; temp: number; condition: string } | null>(null)

  useEffect(() => {
    if (!location) return

    // Simple mock weather for demo - in production use real API
    const mock = [
      { icon: "sun", temp: 24, condition: "Sunny" },
      { icon: "cloud", temp: 18, condition: "Cloudy" },
      { icon: "rain", temp: 15, condition: "Rainy" },
    ]

    setWeather(mock[Math.floor(Math.random() * mock.length)])
  }, [location])

  if (!weather || !location) return null

  const IconComponent = 
    weather.icon === "sun" ? Sun :
    weather.icon === "cloud" ? Cloud :
    CloudRain

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <IconComponent className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-medium text-amber-400">
        {weather.temp}° {weather.condition}
      </span>
    </div>
  )
}
