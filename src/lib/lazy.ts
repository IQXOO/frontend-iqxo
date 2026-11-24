import { lazy, type ComponentType } from "react";

const RELOAD_COOLDOWN_KEY = "iqxo_chunk_error_reload_at";
const RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|ChunkLoadError/i.test(
    message,
  );
}

/**
 * Triggers a single guarded page reload when a lazy route/module fails to fetch
 * (e.g. after a deployment updates chunk hashes or a WebView hits a transient drop).
 */
export function reloadOnChunkError(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) || "0");
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()));
  } catch {
    // sessionStorage may be blocked in restricted contexts; proceed with reload.
  }

  // Ask native wrapper to clear stale disk cache if available, then reload document.
  try {
    const rnBridge = (window as unknown as {
      ReactNativeWebView?: { postMessage?: (data: string) => void };
    }).ReactNativeWebView;
    rnBridge?.postMessage?.(JSON.stringify({ type: "clearWebCache" }));
  } catch {
    // ignore bridge errors
  }

  try {
    const url = new URL(window.location.href);
    // Preserve OAuth callback query/hash unmodified if present
    if (!url.hash.includes("access_token") && !url.searchParams.has("code")) {
      url.searchParams.set("_cb", String(Date.now()));
      window.location.replace(url.toString());
      return true;
    }
  } catch {
    // Fallback to standard reload
  }

  window.location.reload();
  return true;
}

async function loadWithRetry<T>(
  loader: () => Promise<T>,
  label: string,
): Promise<T> {
  try {
    return await loader();
  } catch (firstError) {
    console.error(`Failed to load chunk for ${label}`, firstError);

    if (isChunkLoadError(firstError)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      try {
        return await loader();
      } catch (retryError) {
        if (reloadOnChunkError()) {
          // Keep Suspense pending briefly while navigation unloads the document
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        throw retryError;
      }
    }

    throw firstError;
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  label = "route",
) {
  return lazy(() => loadWithRetry(loader, label));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyNamed<TModule extends Record<string, any>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => {
    const module = await loadWithRetry(loader, String(exportName));
    return { default: module[exportName] as ComponentType<any> };
  });
}