// Lightweight date helper functions to replace date-fns
// Helps reduce JS bundle size and improve load times.

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}

export function isPast(date: Date): boolean {
  const now = new Date();
  return date.getTime() < now.getTime();
}

export function differenceInHours(d1: Date, d2: Date): number {
  const diffMs = d1.getTime() - d2.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function format(date: Date, pattern: string): string {
  if (pattern === "MMM d") {
    const m = date.toLocaleDateString("en-US", { month: "short" });
    const d = date.getDate();
    return `${m} ${d}`;
  }
  if (pattern === "EEE") {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  if (pattern === "MMM") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  if (pattern === "d") {
    return String(date.getDate());
  }
  if (pattern === "EEE, MMM d") {
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const d = date.getDate();
    return `${weekday}, ${month} ${d}`;
  }
  if (pattern === "EEEE, MMMM d, yyyy") {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (pattern === "EEEE, MMMM d") {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  
  // fallback / default
  return date.toLocaleDateString("en-US");
}
