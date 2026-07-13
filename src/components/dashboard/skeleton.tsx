// ─── Skeleton primitives ─────────────────────────────────────────────────────
// مكونات شكل وهمية تظهر بدلاً من المحتوى أثناء التحميل.
// لا تحتوي على داتا — مجرد شكل بـ shimmer animation.

import React from "react";

// ── Base shimmer block ────────────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/8 relative overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/6 to-transparent" />
    </div>
  );
}

// ── StatsCard skeleton ────────────────────────────────────────────────────────
export function StatsCardSkeleton() {
  return (
    <section className="px-5 py-2 space-y-3" aria-label="Loading stats">
      {/* AI assistant card */}
      <div className="rounded-2xl bg-white/5 border border-white/8 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-4 w-3/5 rounded-full" />
      </div>

      {/* Stats label row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* 4-column stats grid */}
      <div className="glass rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-6 w-8 rounded-full" />
              <Skeleton className="h-2.5 w-10 rounded-full" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border/30">
          <Skeleton className="h-3 w-40 rounded-full mx-auto" />
        </div>
      </div>
    </section>
  );
}

// ── Single event card skeleton (grid card size) ───────────────────────────────
function EventCardSkeleton({ isFeature = false }: { isFeature?: boolean }) {
  if (isFeature) {
    return (
      <div className="col-span-2 glass rounded-2xl p-4 flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-full" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-3 h-[140px] flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-5/6 rounded-full" />
        <Skeleton className="h-3 w-3/4 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-2.5 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

// ── EventList section skeleton ────────────────────────────────────────────────
// count: عدد البطاقات اللي هتظهر (الإعداد الافتراضي 4 = صفحة أولى معقولة)
export function EventListSkeleton({
  count = 4,
  label = "Loading events",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <section className="px-5 py-2" aria-label={label}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: count }).map((_, i) => (
          <EventCardSkeleton key={i} isFeature={i === 0 && count > 2} />
        ))}
      </div>
    </section>
  );
}

// ── Full home page skeleton (StatsCard + 2 EventList sections) ─────────────
export function HomePageSkeleton() {
  return (
    <>
      <StatsCardSkeleton />
      <EventListSkeleton count={4} label="Loading upcoming events" />
      <EventListSkeleton count={2} label="Loading later events" />
    </>
  );
}
