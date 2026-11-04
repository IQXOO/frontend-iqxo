"use client"

import { Suspense, useState, useEffect, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import { Sparkles, Clock, Archive, CalendarCheck, TrendingUp, Heart, Download, Shield, Camera, Crown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApp, toLocalDateStr } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { exportEventsToPDF } from "@/lib/export-pdf"
import { SmartActionsCard } from "./smart-actions-card"
import { lazyNamed } from "@/lib/lazy"
import { compressAvatar } from "@/lib/compress-image"
import { isDocumentEvent } from "@/lib/event-category"

const BentoChart = lazyNamed(() => import("./bento-chart"), "BentoChart")

interface ProfileIdentityHubProps {
  onUpgradeClick?: () => void
}

export function ProfileIdentityHub({ onUpgradeClick }: ProfileIdentityHubProps) {
  const { user, events, language, planStatus, trialEndsAt, totalUsage: _totalUsage, fetchArchiveEvents } = useApp()
  const isRTL = language === "ar"

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || 
    user?.email?.split("@")[0] || 
    "Friend"

  // Profile editable fields
  const { toast } = useToast()
  const [profileFullName, setProfileFullName] = useState<string | null>(user?.user_metadata?.full_name ?? null)
  const [profileEmail, setProfileEmail] = useState<string | null>(user?.email ?? null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url ?? null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile row from `profiles` table if exists (full_name, email, avatar_url)
  useEffect(() => {
    let mounted = true
    async function loadProfile() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name,email,avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows found (postgres) — ignore
          throw error
        }

        if (!mounted) return
        if (data) {
          setProfileFullName(data.full_name ?? user.user_metadata?.full_name ?? null)
          setProfileEmail(data.email ?? user.email ?? null)
          setProfileAvatarUrl(data.avatar_url ?? user.user_metadata?.avatar_url ?? null)
        } else {
          // fallback to session
          setProfileFullName(user.user_metadata?.full_name ?? null)
          setProfileEmail(user.email ?? null)
          setProfileAvatarUrl(user.user_metadata?.avatar_url ?? null)
        }
      } catch (err) {
        console.error("Failed to load profile row", err)
        setLoadError("Could not load profile")
      }
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [user])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: language === "ar" ? "ملف غير صالح" : language === "fr" ? "Type de fichier invalide" : "Invalid file type",
        description: language === "ar" ? "يرجى اختيار صورة صالحة." : language === "fr" ? "Veuillez sélectionner un fichier image valide." : "Please select a valid image file.",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    try {
      console.log("Compressing avatar image to WebP...")
      const compressedBlob = await compressAvatar(file)
      const compressedFile = new File([compressedBlob], `${user.id}_avatar.webp`, { type: "image/webp" })
      const filePath = `${user.id}/avatar_${Date.now()}.webp`

      // 1. Storage Upload
      console.log("Starting Storage upload... Path:", filePath)
      const { error: uploadError } = await supabase.storage
        .from("avatar")
        .upload(filePath, compressedFile, { cacheControl: "3600", contentType: "image/webp", upsert: true })

      if (uploadError) {
        console.error("Storage upload error details:", uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }
      console.log("Storage upload successful.")

      // 2. Get Public URL
      console.log("Getting public URL for path:", filePath)
      const { data: { publicUrl } } = supabase.storage
        .from("avatar")
        .getPublicUrl(filePath)
      console.log("Public URL obtained successfully:", publicUrl)

      // 3. Update Auth Metadata
      console.log("Updating auth user metadata with avatar_url:", publicUrl)
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })
      if (authError) {
        console.error("Auth update error details:", authError)
        throw new Error(`Auth update failed: ${authError.message}`)
      }
      console.log("Auth user metadata updated successfully.")

      // 4. Update Profiles Row
      console.log("Updating profiles row in database... user_id:", user.id)
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          avatar_url: publicUrl,
          full_name: profileFullName,
          email: profileEmail
        },
        { onConflict: "user_id" }
      )
      if (profileError) {
        console.error("Profile upsert error details:", profileError)
        throw new Error(`Profiles database update failed: ${profileError.message}`)
      }
      console.log("Profiles database row updated successfully.")

      setProfileAvatarUrl(publicUrl)
      toast({
        title: language === "ar" ? "تم تحديث الصورة الشخصية" : language === "fr" ? "Photo de profil mise à jour" : "Avatar updated",
        description: language === "ar" ? "تم حفظ صورتك الشخصية بنجاح." : language === "fr" ? "Votre photo de profil a été mise à jour." : "Your profile picture has been updated.",
        variant: "default"
      })
    } catch (err) {
      console.error("Failed to upload avatar", err)
      toast({
        title: language === "ar" ? "فشل الرفع" : language === "fr" ? "Échec du téléchargement" : "Upload failed",
        description: err instanceof Error ? err.message : (language === "ar" ? "عذراً حدث خطأ ما." : language === "fr" ? "Impossible de télécharger votre avatar." : "Could not upload your avatar."),
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // DB exact counts state with instant localStorage cache for seamless rendering on refresh
  const [dbStats, setDbStats] = useState<{
    totalEvents: number;
    upcomingEvents: number;
    archivedEvents: number;
    documentsCount: number;
    thisWeekEvents: number;
    loaded: boolean;
  }>(() => {
    if (typeof window !== "undefined" && user?.id) {
      try {
        const cached = localStorage.getItem(`iqxo_profile_stats_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.totalEvents === "number") {
            return { ...parsed, loaded: true };
          }
        }
      } catch (e) {}
    }
    return {
      totalEvents: 0,
      upcomingEvents: 0,
      archivedEvents: 0,
      documentsCount: 0,
      thisWeekEvents: 0,
      loaded: false,
    };
  });

  // Seed from cache immediately when user.id becomes available
  useEffect(() => {
    if (!user?.id) return;
    try {
      const cached = localStorage.getItem(`iqxo_profile_stats_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.totalEvents === "number") {
          setDbStats((prev) => (prev.loaded ? prev : { ...parsed, loaded: true }));
        }
      }
    } catch (e) {}
  }, [user?.id]);

  // Fetch real database counts directly from Supabase to ensure accurate, stable metrics
  useEffect(() => {
    let mounted = true;
    async function loadRealDbStats() {
      if (!user?.id) return;
      try {
        const todayStr = toLocalDateStr();
        
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const startStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const endStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

        const [totalRes, upcomingRes, archivedRes, docsRes, thisWeekRes, wsRes] = await Promise.all([
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .or(`date.gte.${todayStr},recurrence_rule.not.is.null`),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .lt("date", todayStr)
            .is("recurrence_rule", null),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .or("image_url.not.is.null,pdf_url.not.is.null,source.eq.upload,source.eq.photo"),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("date", startStr)
            .lte("date", endStr),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("source", "work_schedule"),
        ]);

        if (!mounted) return;

        const wsCount = wsRes.count ?? 0;
        const upcoming = Math.max(0, (upcomingRes.count ?? 0) - wsCount);
        const archived = archivedRes.count ?? 0;
        const total = Math.max(0, (totalRes.count ?? (upcoming + archived)) - wsCount);
        const docs = docsRes.count ?? 0;
        const thisWeek = thisWeekRes.count ?? 0;

        const newStats = {
          totalEvents: total,
          upcomingEvents: upcoming,
          archivedEvents: archived,
          documentsCount: docs,
          thisWeekEvents: thisWeek,
          loaded: true,
        };

        setDbStats(newStats);

        // Cache real stats for instant, zero-delay rendering on future refreshes
        try {
          localStorage.setItem(`iqxo_profile_stats_${user.id}`, JSON.stringify(newStats));
        } catch (e) {}
      } catch (err) {
        console.error("Failed to load real DB stats", err);
      }
    }

    loadRealDbStats();

    // In background, populate archive events into store so PDF export includes all history
    if (fetchArchiveEvents) {
      fetchArchiveEvents().catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, fetchArchiveEvents]);

  // Real events in memory excluding virtual work shifts
  const realEvents = useMemo(() => {
    return events.filter(
      (e) => e.source !== "work_schedule" && e.source !== "work_schedule_virtual"
    );
  }, [events]);

  const inMemoryDocs = useMemo(() => {
    return realEvents.filter((e) => isDocumentEvent(e)).length;
  }, [realEvents]);

  const inMemoryUpcoming = useMemo(() => {
    return realEvents.filter((e) => new Date(e.date) >= new Date() || !!e.recurrence_rule).length;
  }, [realEvents]);

  const inMemoryArchived = useMemo(() => {
    return realEvents.filter((e) => new Date(e.date) < new Date() && !e.recurrence_rule).length;
  }, [realEvents]);

  // True stats: from DB when loaded, falling back gracefully to memory
  const totalEvents = dbStats.loaded ? dbStats.totalEvents : realEvents.length;
  const upcomingEvents = dbStats.loaded ? dbStats.upcomingEvents : inMemoryUpcoming;
  const archivedEvents = dbStats.loaded ? dbStats.archivedEvents : inMemoryArchived;
  const documentsProcessed = dbStats.loaded ? Math.max(dbStats.documentsCount, inMemoryDocs) : inMemoryDocs;
  const _organizationScore = totalEvents > 0 ? Math.min(100, Math.round((archivedEvents / totalEvents) * 100)) : 0;

  // Calculate hours saved (estimate: 5 mins per event)
  const hoursSaved = Math.round((totalEvents * 5) / 60);

  // Get dynamic title based on engagement
  const getTitle = () => {
    if (totalEvents >= 50) return language === "ar" ? "سيد الاستراتيجية" : language === "fr" ? "Maître Stratège" : "Strategy Master"
    if (totalEvents >= 25) return language === "ar" ? "خبير التنظيم" : language === "fr" ? "Expert Organisation" : "Organization Expert"
    if (totalEvents >= 10) return language === "ar" ? "مخطط بارع" : language === "fr" ? "Planificateur Qualifié" : "Skilled Planner"
    return language === "ar" ? "مستكشف جديد" : language === "fr" ? "Étoile Montante" : "Rising Star"
  }

  // Life Stats grid
  const lifeStats = [
    {
      icon: Archive,
      label: language === "ar" ? "وثائق معالجة" : language === "fr" ? "Documents Traités" : "Documents Processed",
      value: documentsProcessed,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-400",
    },
    {
      icon: CalendarCheck,
      label: language === "ar" ? "أحداث مستقبلية" : language === "fr" ? "Événements Futurs" : "Future Events",
      value: upcomingEvents,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400",
    },
    {
      icon: Clock,
      label: language === "ar" ? "ذكريات محفوظة" : language === "fr" ? "Souvenirs Archivés" : "Archived Memories",
      value: archivedEvents,
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
    },
    {
      icon: TrendingUp,
      label: language === "ar" ? "ساعات موفرة" : language === "fr" ? "Heures Économisées" : "Hours Saved",
      value: `${hoursSaved}h`,
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
    },
  ]

  // Warm, human messages
  const getEncouragingMessage = () => {
    if (hoursSaved >= 5) {
      return language === "ar" 
        ? `لقد وفرت ${hoursSaved} ساعات هذا الأسبوع. أنت رائع!` 
        : language === "fr"
        ? `Vous avez économisé ${hoursSaved} heures cette semaine. Excellent travail !`
        : `You've saved ${hoursSaved} hours this week. Great job!`
    }
    if (totalEvents >= 10) {
      return language === "ar" 
        ? `${totalEvents} لحظة من حياتك منظمة بعناية. استمر!` 
        : language === "fr"
        ? `${totalEvents} moments de votre vie, parfaitement organisés. Continuez !`
        : `${totalEvents} moments of your life, beautifully organized. Keep going!`
    }
    return language === "ar" 
      ? `أنت تبني شيئاً مميزاً هنا، يا ${firstName}.` 
      : language === "fr"
      ? `Vous construisez quelque chose de spécial ici, ${firstName}.`
      : `You're building something special here, ${firstName}.`
  }

  return (
    <div className={`px-5 py-6 space-y-6 ${isRTL ? "dir-rtl text-right" : ""}`}>
      {/* Glass ID Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden"
      >
        {/* Subtle animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl" />
        
        {/* Card */}
        <div className="relative glass rounded-3xl p-6 border border-border backdrop-blur-xl">
          {/* Decorative blurs */}
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

          {/* ID Card Header */}
          <div className="relative z-10 flex items-center gap-4 mb-5">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-18 w-18 ring-2 ring-primary/30 ring-offset-2 ring-offset-background relative overflow-hidden">
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                )}
                <AvatarImage
                  src={profileAvatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${firstName}`}
                  alt={firstName}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-white text-xl font-bold">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
                aria-label="Upload avatar"
              />
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                {!editing ? (
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{profileFullName ?? firstName}</h2>
                ) : (
                  <input
                    value={profileFullName ?? ""}
                    onChange={(e) => setProfileFullName(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    aria-label="Full name"
                    />
                )}

                <div className="ml-auto flex items-center gap-2">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-sm text-primary px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={async () => {
                          if (!user) return
                          setSaving(true)
                          try {
                            const nextFullName = (profileFullName ?? "").trim() || null
                            const upsert = {
                              user_id: user.id,
                              full_name: nextFullName,
                              email: profileEmail ?? user.email,
                              avatar_url: profileAvatarUrl,
                            }
                            console.log("Updating auth name metadata...")
                            const { error: authError } = await supabase.auth.updateUser({
                              data: { full_name: nextFullName ?? "" },
                            })
                            if (authError) throw authError
                            console.log("Auth name updated successfully.")

                            console.log("Upserting profile row in database... user_id:", user.id)
                            const { error: profileError } = await supabase
                              .from("profiles")
                              .upsert(upsert, { onConflict: "user_id" })
                            if (profileError) {
                              console.warn("Profile row sync skipped", profileError)
                              throw profileError
                            }
                            console.log("Profile row upserted successfully.")

                            toast({ title: "Profile updated", description: "Your name was saved.", variant: "default" })
                            setEditing(false)
                          } catch (err) {
                            console.error("Failed to save profile", err)
                            toast({
                              title: "Save failed",
                              description: err instanceof Error ? err.message : "Could not save your profile.",
                              variant: "destructive",
                            })
                          } finally {
                            setSaving(false)
                          }
                        }}
                        disabled={saving}
                        className="text-sm text-white bg-primary px-3 py-1 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false)
                        }}
                        className="text-sm text-muted-foreground px-2 py-1 rounded-lg hover:bg-secondary/50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-sm font-medium text-primary">{getTitle()}</p>
              </div>
            </div>
          </div>

          {/* Warm Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 mb-5 p-4 rounded-2xl bg-secondary/30 border border-border"
          >
            <div className="flex items-start gap-3">
              <Heart className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/70 leading-relaxed">
                {getEncouragingMessage()}
              </p>
            </div>
          </motion.div>

          {/* Contact row: email (non-editable) */}
          <div className="relative z-10 mt-3">
            <p className="text-xs text-muted-foreground">{language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email"}</p>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-sm text-foreground/90">{profileEmail ?? user?.email}</div>
              <div className="text-[11px] text-muted-foreground">{user?.email ? (language === "ar" ? "مؤكد" : language === "fr" ? "Vérifié" : "Verified") : (language === "ar" ? "غير مؤكد" : language === "fr" ? "Non vérifié" : "Unverified")}</div>
            </div>
          </div>

          {/* Organization Score Progress Bar - Hidden per user request */}
          {/*
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {language === "ar" ? "معدل التنظيم" : language === "fr" ? "Score d'organisation" : "Organization Score"}
              </span>
              <span className="font-semibold text-blue-400">{_organizationScore}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${_organizationScore}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              />
            </div>
          </div>
          */}
        </div>
      </motion.div>

      {/* Smart Actions Remaining Card */}
      <SmartActionsCard />

      {/* Life Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {lifeStats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`glass rounded-2xl p-4 border border-border bg-gradient-to-br ${stat.color} cursor-default`}
          >
            <stat.icon className={`w-5 h-5 ${stat.iconColor} mb-3`} strokeWidth={1.5} />
            <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Visual Analytics - Bento Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-5 border border-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {language === "ar" ? "تحليلات الإنتاجية" : language === "fr" ? "Analyses de productivité" : "Productivity Analytics"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {language === "ar" ? "نظرة عامة على حياتك المنظمة" : language === "fr" ? "Aperçu de votre vie organisée" : "Overview of your organized life"}
            </p>
          </div>
        </div>
        <Suspense fallback={<div className="h-48 rounded-2xl border border-border bg-secondary/20 animate-pulse" />}>
          <BentoChart
            totalTasks={totalEvents}
            thisWeekCount={dbStats.loaded ? dbStats.thisWeekEvents : undefined}
            documentsCount={documentsProcessed}
          />
        </Suspense>
      </motion.div>

      {/* Plan Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="glass rounded-2xl p-5 border border-border"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {planStatus === "pro"
                    ? (language === "ar" ? "Pro" : language === "fr" ? "Plan Pro" : "Pro Plan")
                    : planStatus === "free_trial"
                    ? (language === "ar" ? "تجربة مجانية" : language === "fr" ? "Essai gratuit" : "Free Trial")
                    : planStatus === "expired"
                    ? (language === "ar" ? "التجربة انتهت" : language === "fr" ? "Essai expiré" : "Trial Expired")
                    : (language === "ar" ? "لا توجد خطة" : language === "fr" ? "Aucun plan" : "No Plan")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {planStatus === "free_trial" && trialEndsAt
                    ? (language === "ar"
                        ? `تنتهي ${new Date(trialEndsAt).toLocaleDateString("ar")}`
                        : language === "fr"
                        ? `Expire le ${new Date(trialEndsAt).toLocaleDateString("fr-FR")}`
                        : `Ends ${new Date(trialEndsAt).toLocaleDateString()}`)
                    : planStatus === "pro"
                    ? (language === "ar" ? "وصول كامل" : language === "fr" ? "Accès complet" : "Full access")
                    : (language === "ar" ? "اختر خطة للمتابعة" : language === "fr" ? "Choisissez un plan pour continuer" : "Choose a plan to continue")}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              planStatus === "pro"
                ? "bg-emerald-500/20 text-emerald-400"
                : planStatus === "free_trial"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-rose-500/20 text-rose-400"
            }`}>
              {planStatus === "pro" ? (language === "ar" ? "✓ نشط" : language === "fr" ? "✓ Actif" : "✓ Active") : planStatus === "free_trial" ? (language === "ar" ? "تجربة" : language === "fr" ? "Essai" : "Trial") : (language === "ar" ? "غير نشط" : language === "fr" ? "Inactif" : "Inactive")}
            </div>
          </div>

          {planStatus !== "pro" && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onUpgradeClick}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold hover:from-amber-600 hover:to-amber-700 transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "ترقية الحساب إلى Pro" : language === "fr" ? "Passer à Pro" : "Upgrade to Pro"}</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Secure Export Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-2xl p-5 border border-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {language === "ar" ? "النسخ الاحتياطي الآمن" : language === "fr" ? "Sauvegarde sécurisée" : "Secure Backup"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {language === "ar" ? "تصدير سجلاتك بأمان" : language === "fr" ? "Exportez vos dossiers en toute sécurité" : "Export your records securely"}
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => {
            try {
              console.log("[Export] Button clicked, events:", events?.length)
              exportEventsToPDF(events, user?.email)
              console.log("[Export] Function called successfully")
            } catch (err) {
              console.error("[Export] Error:", err)
              alert("Export error: " + err)
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:from-emerald-500/30 hover:to-blue-500/30 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{language === "ar" ? "تصدير كـ PDF" : language === "fr" ? "Exporter en PDF" : "Export as PDF"}</span>
        </motion.button>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          {language === "ar" 
            ? "يتم تنزيل جميع البيانات محليًا، بدون مشاركة خارجية" 
            : language === "fr"
            ? "Toutes les données sont téléchargées localement. Aucun partage externe."
            : "All data is downloaded locally. No external sharing."}
        </p>
      </motion.div>

      {/* Achievements Teaser */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-2xl p-5 border border-border/50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {language === "ar" ? "الإنجازات القادمة" : language === "fr" ? "Succès à venir" : "Achievements Coming Soon"}
          </h3>
          <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-full bg-secondary/50">
            {language === "ar" ? "قريباً" : language === "fr" ? "Bientôt" : "Soon"}
          </span>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="h-10 w-10 rounded-xl bg-secondary/30 border border-border flex items-center justify-center text-muted-foreground/50 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
